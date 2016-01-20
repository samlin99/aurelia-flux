declare module 'aurelia-flux' {
  import { resolver }  from 'aurelia-dependency-injection';
  import { HtmlBehaviorResource }  from 'aurelia-templating';
  import { Dispatcher, DispatcherProxy }  from 'aurelia-flux/instance-dispatcher';
  import { FluxDispatcher }  from 'aurelia-flux/flux-dispatcher';
  import { Metadata }  from 'aurelia-flux/metadata';
  import { Symbols }  from 'aurelia-flux/symbols';
  import Promise from 'bluebird';
  import { activationStrategy }  from 'aurelia-router';
  export class LifecycleManager {
    static interceptInstanceDeactivators(instance: any): any;
    static interceptInstanceDeactivate(instance: any): any;
    static interceptInstanceDetached(instance: any): any;
    static interceptHtmlBehaviorResource(): any;
    static interceptClassActivator(aurelia: any): any;
  }
  class DispatcherResolver {
    get(container: any): any;
  }
  class InstanceDispatcher {
    obj: any;
    dispatch(method: any, ...payload: any[]): any;
    connect(instance: any): any;
  }
}