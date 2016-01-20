'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _aureliaDependencyInjection = require('aurelia-dependency-injection');

var _aureliaTemplating = require('aurelia-templating');

var _instanceDispatcher = require('./instance-dispatcher');

var _fluxDispatcher = require('./flux-dispatcher');

var _metadata = require('./metadata');

var _symbols = require('./symbols');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _aureliaRouter = require('aurelia-router');

var LifecycleManager = (function () {
    function LifecycleManager() {
        _classCallCheck(this, LifecycleManager);
    }

    LifecycleManager.interceptInstanceDeactivators = function interceptInstanceDeactivators(instance) {
        if (instance[_symbols.Symbols.deactivators] === true) {
            return;
        }

        LifecycleManager.interceptInstanceDeactivate(instance);
        LifecycleManager.interceptInstanceDetached(instance);

        instance[_symbols.Symbols.deactivators] = true;
    };

    LifecycleManager.interceptInstanceDeactivate = function interceptInstanceDeactivate(instance) {

        function _unregister() {
            if (_fluxDispatcher.FluxDispatcher.instance.strategy !== _aureliaRouter.activationStrategy.invokeLifecycle) {
                _fluxDispatcher.FluxDispatcher.instance.unregisterInstanceDispatcher(instance[_symbols.Symbols.instanceDispatcher]);
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
                _fluxDispatcher.FluxDispatcher.instance.unregisterInstanceDispatcher(instance[_symbols.Symbols.instanceDispatcher]);

                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                }

                deactivateImpl.apply(instance, args);
            };
        } else {
            instance.detached = function () {
                _fluxDispatcher.FluxDispatcher.instance.unregisterInstanceDispatcher(instance[_symbols.Symbols.instanceDispatcher]);
            };
        }
    };

    LifecycleManager.interceptHtmlBehaviorResource = function interceptHtmlBehaviorResource() {
        if (_aureliaTemplating.HtmlBehaviorResource === undefined || typeof _aureliaTemplating.HtmlBehaviorResource.prototype.initialize !== 'function') {
            throw new Error('Unsupported version of HtmlBehaviorResource');
        }

        var analyzeImpl = _aureliaTemplating.HtmlBehaviorResource.prototype.initialize;

        _aureliaTemplating.HtmlBehaviorResource.prototype.initialize = function () {
            for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
            }

            var target = args[1];
            if (target && target.prototype && target.prototype[_symbols.Symbols.metadata] && target.prototype[_symbols.Symbols.metadata].handlers && target.prototype[_symbols.Symbols.metadata].handlers.size) {
                if (target.prototype.detached === undefined) {
                    target.prototype.detached = function () {};
                }
            }
            return analyzeImpl.apply(this, args);
        };
    };

    LifecycleManager.interceptClassActivator = function interceptClassActivator(aurelia) {
        aurelia.container.setHandlerCreatedCallback(function (handler) {

            var index = handler.dependencies.indexOf(_instanceDispatcher.Dispatcher);

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

exports.LifecycleManager = LifecycleManager;

var DispatcherResolver = (function () {
    function DispatcherResolver() {
        _classCallCheck(this, _DispatcherResolver);
    }

    DispatcherResolver.prototype.get = function get(container) {
        return container._lastDispatcher = container.get(InstanceDispatcher);
    };

    var _DispatcherResolver = DispatcherResolver;
    DispatcherResolver = _aureliaDependencyInjection.resolver(DispatcherResolver) || DispatcherResolver;
    return DispatcherResolver;
})();

var InstanceDispatcher = (function () {
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

        if (_metadata.Metadata.exists(Object.getPrototypeOf(instance))) {
            if (instance[_symbols.Symbols.instanceDispatcher] === undefined) {
                instance[_symbols.Symbols.instanceDispatcher] = new _instanceDispatcher.Dispatcher(instance);
                this.obj = instance[_symbols.Symbols.instanceDispatcher];
            }
            instance[_symbols.Symbols.instanceDispatcher].registerMetadata();
        }

        if (instance[_symbols.Symbols.instanceDispatcher] !== undefined) {
            LifecycleManager.interceptInstanceDeactivators(instance);
        }

        return instance;
    };

    return InstanceDispatcher;
})();