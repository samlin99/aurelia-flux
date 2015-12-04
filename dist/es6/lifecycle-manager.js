import {resolver} from 'aurelia-dependency-injection';
import {HtmlBehaviorResource} from 'aurelia-templating';
import {Dispatcher, DispatcherProxy} from './instance-dispatcher';
import {FluxDispatcher} from './flux-dispatcher';
import {Metadata} from './metadata';
import {Symbols} from './symbols';
import Promise from 'bluebird';
import {activationStrategy} from 'aurelia-router';

export class LifecycleManager {

    static interceptInstanceDeactivators(instance) {
        if(instance[Symbols.deactivators] === true) {
          return;
        }

        LifecycleManager.interceptInstanceDeactivate(instance);
        LifecycleManager.interceptInstanceDetached(instance);

        instance[Symbols.deactivators] = true;
    }

    static interceptInstanceDeactivate(instance) {

      function _unregister() {
        if(FluxDispatcher.instance.strategy !== activationStrategy.invokeLifecycle) {
          FluxDispatcher.instance.unregisterInstanceDispatcher(instance[Symbols.instanceDispatcher]);
        }
      }

      if(instance.deactivate !== undefined) {
          var deactivateImpl = instance.deactivate;
          instance.deactivate = function(...args) {
              _unregister();              
              deactivateImpl.apply(instance, args);
          };
      } else {
          instance.deactivate = function() {
              _unregister();
          };
      }
    }

    static interceptInstanceDetached(instance) {
      if(instance.detached !== undefined) {
          var deactivateImpl = instance.detached;
          instance.detached = function(...args) {
              FluxDispatcher.instance.unregisterInstanceDispatcher(instance[Symbols.instanceDispatcher]);
              deactivateImpl.apply(instance, args);
          };
      } else {
          instance.detached = function() {
              FluxDispatcher.instance.unregisterInstanceDispatcher(instance[Symbols.instanceDispatcher]);
          };
      }
    }

    static interceptHtmlBehaviorResource() {
      if(HtmlBehaviorResource === undefined || typeof HtmlBehaviorResource.prototype.initialize !== 'function') {
        throw new Error('Unsupported version of HtmlBehaviorResource');
      }

      var analyzeImpl = HtmlBehaviorResource.prototype.initialize;

      HtmlBehaviorResource.prototype.initialize = function(...args) {
        let target = args[1];        
        if(    target
            && target.prototype
            && target.prototype[Symbols.metadata]
            && target.prototype[Symbols.metadata].handlers
            && target.prototype[Symbols.metadata].handlers.size) {
          if(target.prototype.detached === undefined) {
            target.prototype.detached = function() {};
          }
        }
        return analyzeImpl.apply(this, args);
      };
    }

    static interceptClassActivator(aurelia) {      
        aurelia.container.setHandlerCreatedCallback(handler => {
              //this callback is called once per type that the container will instantiate
              //so, for Foo, it will be called once during the application lifetime
              //but you can inspect what the container finds, change it and...
              //control how instances of that type are created thereafter

              //so we only have to change the invocation when the type actually has a dependency on Dispatcher
               // console.log("++++++++++++++++++++++++++++++++Test ");

              let index = handler.dependencies.indexOf(Dispatcher);
              if(index !== -1) {
                handler.dependencies[index] = new DispatcherResolver();

                let invoke = handler.invoke;
                handler.invoke = function(container, dynamicDependencies) {
                  let instance = invoke.call(handler, container, dynamicDependencies);
                  container._lastDispatcher.connect(instance);
                  container._lastDispatcher = null;
                  return instance;
                };
              }


              return handler
            }
        );
        /*
  
        console.log(FactoryInvoker.instance);
	 if(FactoryInvoker.instance === undefined || FactoryInvoker.instance.invoke === undefined) {
            throw new Error('Unsupported version of FactoryInvoker');
        }        
        var invokeImpl = FactoryInvoker.instance.invoke;
        FactoryInvoker.instance.invoke = function(...invokeArgs) {
           // var args = invokeArgs[1],
           //     instance;    
		
		var [type, args] = invokeArgs,
                instance,
                dispatcher = args.find((item) => { return item instanceof Dispatcher; });            
    

            if(Array.isArray(args) === false) {
                throw new Error('Unsupported version of Container');
            }
            
            //var dispatcher = args.find((item) => { return item instanceof Dispatcher; });
            
            if(dispatcher) {
                var instancePromise = Promise.defer();
                args[args.indexOf(dispatcher)] = new DispatcherProxy(instancePromise.promise);
                instance = invokeImpl.apply(this, invokeArgs);                
                instance[Symbols.instanceDispatcher] = new Dispatcher(instance);
                instancePromise.resolve(instance);
            } else {
                instance = invokeImpl.apply(this, invokeArgs);
            }
            
            if(Metadata.exists(Object.getPrototypeOf(instance))) {
                if(instance[Symbols.instanceDispatcher] === undefined) {
                    instance[Symbols.instanceDispatcher] = new Dispatcher(instance);
                }                
                instance[Symbols.instanceDispatcher].registerMetadata();
            }

            if(instance[Symbols.instanceDispatcher] !== undefined) {
                LifecycleManager.interceptInstanceDeactivators(instance);
            }

            return instance;
        };
        */
    }
}

    //a custom resolver's get is invoked by the container to "resolve" an instance
    //we use a special resolver so we can capture the instance for later use in our invoke fixup
    @resolver
    class DispatcherResolver {
      get(container) {
        //not sure how you want to create it, but do that here
        //and then store it temporarily on the container, so you can grab it later
        return container._lastDispatcher = container.get(InstanceDispatcher); 
      }
    }

    class InstanceDispatcher {
      obj ;
      dispatch(method, payload) {
         this.obj.dispatch(method, payload);
      }
      connect(instance) {

        if(Metadata.exists(Object.getPrototypeOf(instance))) {
                if(instance[Symbols.instanceDispatcher] === undefined) {
                    instance[Symbols.instanceDispatcher] = new Dispatcher(instance);
                    this.obj = instance[Symbols.instanceDispatcher];
                }                
                instance[Symbols.instanceDispatcher].registerMetadata();
            }

            if(instance[Symbols.instanceDispatcher] !== undefined) {
                LifecycleManager.interceptInstanceDeactivators(instance);
            }

            return instance;
      }
    }