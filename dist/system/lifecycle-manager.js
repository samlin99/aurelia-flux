System.register(['aurelia-dependency-injection', 'aurelia-templating', './instance-dispatcher', './flux-dispatcher', './metadata', './symbols', 'bluebird', 'aurelia-router'], function (_export) {
    'use strict';

    var resolver, HtmlBehaviorResource, Dispatcher, DispatcherProxy, FluxDispatcher, Metadata, Symbols, Promise, activationStrategy, LifecycleManager, DispatcherResolver, InstanceDispatcher;

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

    return {
        setters: [function (_aureliaDependencyInjection) {
            resolver = _aureliaDependencyInjection.resolver;
        }, function (_aureliaTemplating) {
            HtmlBehaviorResource = _aureliaTemplating.HtmlBehaviorResource;
        }, function (_instanceDispatcher) {
            Dispatcher = _instanceDispatcher.Dispatcher;
            DispatcherProxy = _instanceDispatcher.DispatcherProxy;
        }, function (_fluxDispatcher) {
            FluxDispatcher = _fluxDispatcher.FluxDispatcher;
        }, function (_metadata) {
            Metadata = _metadata.Metadata;
        }, function (_symbols) {
            Symbols = _symbols.Symbols;
        }, function (_bluebird) {
            Promise = _bluebird['default'];
        }, function (_aureliaRouter) {
            activationStrategy = _aureliaRouter.activationStrategy;
        }],
        execute: function () {
            LifecycleManager = (function () {
                function LifecycleManager() {
                    _classCallCheck(this, LifecycleManager);
                }

                LifecycleManager.interceptInstanceDeactivators = function interceptInstanceDeactivators(instance) {
                    if (instance[Symbols.deactivators] === true) {
                        return;
                    }

                    LifecycleManager.interceptInstanceDeactivate(instance);
                    LifecycleManager.interceptInstanceDetached(instance);

                    instance[Symbols.deactivators] = true;
                };

                LifecycleManager.interceptInstanceDeactivate = function interceptInstanceDeactivate(instance) {

                    function _unregister() {
                        if (FluxDispatcher.instance.strategy !== activationStrategy.invokeLifecycle) {
                            FluxDispatcher.instance.unregisterInstanceDispatcher(instance[Symbols.instanceDispatcher]);
                        }
                    }

                    if (instance.deactivate !== undefined) {
                        var deactivateImpl = instance.deactivate;
                        instance.deactivate = function () {
                            _unregister();

                            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                                args[_key] = arguments[_key];
                            }

                            deactivateImpl.apply(instance, args);
                        };
                    } else {
                        instance.deactivate = function () {
                            _unregister();
                        };
                    }
                };

                LifecycleManager.interceptInstanceDetached = function interceptInstanceDetached(instance) {
                    if (instance.detached !== undefined) {
                        var deactivateImpl = instance.detached;
                        instance.detached = function () {
                            FluxDispatcher.instance.unregisterInstanceDispatcher(instance[Symbols.instanceDispatcher]);

                            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                                args[_key2] = arguments[_key2];
                            }

                            deactivateImpl.apply(instance, args);
                        };
                    } else {
                        instance.detached = function () {
                            FluxDispatcher.instance.unregisterInstanceDispatcher(instance[Symbols.instanceDispatcher]);
                        };
                    }
                };

                LifecycleManager.interceptHtmlBehaviorResource = function interceptHtmlBehaviorResource() {
                    if (HtmlBehaviorResource === undefined || typeof HtmlBehaviorResource.prototype.initialize !== 'function') {
                        throw new Error('Unsupported version of HtmlBehaviorResource');
                    }

                    var analyzeImpl = HtmlBehaviorResource.prototype.initialize;

                    HtmlBehaviorResource.prototype.initialize = function () {
                        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                            args[_key3] = arguments[_key3];
                        }

                        var target = args[1];
                        if (target && target.prototype && target.prototype[Symbols.metadata] && target.prototype[Symbols.metadata].handlers && target.prototype[Symbols.metadata].handlers.size) {
                            if (target.prototype.detached === undefined) {
                                target.prototype.detached = function () {};
                            }
                        }
                        return analyzeImpl.apply(this, args);
                    };
                };

                LifecycleManager.interceptClassActivator = function interceptClassActivator(aurelia) {
                    aurelia.container.setHandlerCreatedCallback(function (handler) {

                        var index = handler.dependencies.indexOf(Dispatcher);

                        if (index == -1) {
                            for (var i = 0; i < handler.dependencies.length; i++) {
                                if (handler.dependencies[i] instanceof DispatcherResolver) index = i;
                            }
                        }

                        if (index !== -1) {
                            (function () {
                                handler.dependencies[index] = new DispatcherResolver();

                                var invoke = handler.invoke;
                                handler.invoke = function (container, dynamicDependencies) {
                                    var instance = invoke.call(handler, container, dynamicDependencies);
                                    try {
                                        if (container._lastDispatcher == null) instance.dispatcher.connect(instance);else container._lastDispatcher.connect(instance);
                                        container._lastDispatcher = null;
                                    } catch (e) {
                                        console.log(e);
                                    }
                                    return instance;
                                };
                            })();
                        }

                        return handler;
                    });
                };

                return LifecycleManager;
            })();

            _export('LifecycleManager', LifecycleManager);

            DispatcherResolver = (function () {
                function DispatcherResolver() {
                    _classCallCheck(this, _DispatcherResolver);
                }

                DispatcherResolver.prototype.get = function get(container) {
                    return container._lastDispatcher = container.get(InstanceDispatcher);
                };

                var _DispatcherResolver = DispatcherResolver;
                DispatcherResolver = resolver(DispatcherResolver) || DispatcherResolver;
                return DispatcherResolver;
            })();

            InstanceDispatcher = (function () {
                function InstanceDispatcher() {
                    _classCallCheck(this, InstanceDispatcher);
                }

                InstanceDispatcher.prototype.dispatch = function dispatch(method) {
                    var _obj;

                    for (var _len4 = arguments.length, payload = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
                        payload[_key4 - 1] = arguments[_key4];
                    }

                    (_obj = this.obj).dispatch.apply(_obj, [method].concat(payload));
                };

                InstanceDispatcher.prototype.connect = function connect(instance) {

                    if (Metadata.exists(Object.getPrototypeOf(instance))) {
                        if (instance[Symbols.instanceDispatcher] === undefined) {
                            instance[Symbols.instanceDispatcher] = new Dispatcher(instance);
                            this.obj = instance[Symbols.instanceDispatcher];
                        }
                        instance[Symbols.instanceDispatcher].registerMetadata();
                    }

                    if (instance[Symbols.instanceDispatcher] !== undefined) {
                        LifecycleManager.interceptInstanceDeactivators(instance);
                    }

                    return instance;
                };

                return InstanceDispatcher;
            })();
        }
    };
});