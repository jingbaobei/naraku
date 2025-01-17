import {noValue, stopRun, blank, errorLog, snapshot, same} from './Utils.js';

let _Emitter = null;
let dataHubKey = 1;
let lagTime = 40;

const emitterMethods = ['on', 'once', 'emit', 'off'];
const statusList = ['undefined', 'loading', 'locked', 'set', 'error']; 

function ifInvalid(result){
  return function(target, name, descriptor){
    const oldFun = target[name];
    descriptor.value = function(...args) {
      if (this._invalid) {
        return result;
      }
      return oldFun.apply(this, args);
    }
    return descriptor;
  }
}

/*
   函数执行者，可用作过滤器
 */
export class Executor {
  
  constructor() {
    this.myKey = dataHubKey++;
    this._invalid = false;
    this._before = {};
    this._after = {};
    this._runner = {};
  }
  
  @ifInvalid()
  register(name, fun) {
    if (noValue(name)) {
      return;
    }
    
    if(fun === false) {
      this._before[name] = null;
      this._after[name] = null;
      this._runner[name] = null;
      return;
    }
    
    if (this._runner[name]) {
      return;
    }
    
    this._runner[name] = fun;
  }
  
  @ifInvalid()
  has(name){
   return  !!this._runner[name];
  }
  
  @ifInvalid()
  before(name, fun) {
    if (noValue(name) || !this._runner[name]) {
      return;
    }
    
    this._before[name] = this._before[name] || [];
    this._before[name].push(fun);
    
    return () => {
      if (this._invalid || !this._before[name]) {
        return;
      }
      const i = this._before[name].indexOf(fun);
      if(i !== -1){
        this._before[name].selice(i, 1);
      }
    }
  }
  
  @ifInvalid()
  after(name, fun) {
    if (noValue(name) || !this._runner[name]) {
      return;
    }
    
    this._after[name] = this._after[name] || [];
    this._after[name].push(fun);
    
    return () => {
      if (this._invalid || !this._after[name]) {
        return;
      }
      const i = this._after[name].indexOf(fun);
      if(i !== -1){
        this._after[name].selice(i, 1);
      }
    }
  }
  
  @ifInvalid()
  run(name, ...args){
    if (noValue(name) || !this._runner[name]) {
      errorLog(`unknown runner ${name}`);
      return;
    }
    
    const befores = this._before[name] || [];
    let newArgs = args;
    for (let before of befores) {
      newArgs = before && before(newArgs, args);
      if(newArgs === stopRun) {
        return stopRun;
      }
    }
    
    const result = this._runner[name](...newArgs);
    const afters = this._after[name] || [];
    let newResult = result
    for (let after of afters) {
      newResult = after && after(newResult, result, newArgs, args);
    }
    
    return newResult;
  }
  
  @ifInvalid()
  destroy(name) {
    this._invalid = true;
    this._before = null;
    this._after = null;
    this._runner = null;
  }
}

/*
  DateHub控制器 
*/
export class Controller {
  constructor(_dataHub) {
    this.myKey = dataHubKey++;
    this._dataHub = _dataHub;
    this._emitter = _dataHub._emitter;
    this._invalid = false;
    this._offList = [];
    this._runnerList = [];
  }
  
  @ifInvalid()
  get(name) {
    return this._dataHub.get(name);
  }
  
  @ifInvalid()
  hasRunner(name) {
    return this._executor.has(name);
  }
  
  @ifInvalid()
  first(name) {
    return this._dataHub.first(name);
  }
  
  @ifInvalid()
  refresh(name) {
    return this._dataHub.refresh(name);
  }
  
  @ifInvalid()
  submit(name, param) {
    return this._dataHub.submit(name, param);
  }
  
  @ifInvalid()
  set(name, value) {
    return this._dataHub.set(name, value);
  }
  
  @ifInvalid()
  assign0(name, obj) {
    return this._dataHub.assign0(name, obj);
  }
  
  @ifInvalid()
  delete(name) {
    return this._dataHub.delete(name);
  }
  
  @ifInvalid()
  emit(name, ...args) {
    return this._dataHub.emit(name, ...args);
  }
  
  @ifInvalid()
  snapshot(from, to) {
    return this._dataHub.snapshot(from, to);
  }
  
  @ifInvalid()
  reset(name) {
    return this._dataHub.reset(name);
  }
  
  @ifInvalid()
  status(...a) {
    return this._dataHub.status(...a);
  }
  
  @ifInvalid(blank)
  load(name, callback){
    return this.when(name, callback, true);
  }
  
  @ifInvalid(false)
  loading(list) {
    return this._dataHub.loading(list);
  }
  
  @ifInvalid(false)
  ready(list) {
    return this._dataHub.ready(list);
  }

  @ifInvalid()
  destroy() {
    this._invalid = true;
    clearTimeout(this._watchTimeoutIndex);   
    this._offList.forEach(off => off());
    this._runnerList.forEach(name => {
      this._dataHub._executor && this._dataHub._executor.register(name, false);
    });    
    this._runnerList = null;
    this._offList = null;
    this._dataHub = null;
    this._emitter = null;
  }
  
  @ifInvalid()
  run(name, ...args) {
    return this._dataHub._executor.run(name, ...args);
  }
  
  @ifInvalid()
  register = (name, callback) => {
    this._runnerList.push(name);
    this._dataHub._executor.register(name, callback);
  }
  
  @ifInvalid()
  before = (name, callback) => {
    this._dataHub._executor.before(name, callback);
  }
  
  @ifInvalid()
  after = (name, callback) => {
    this._dataHub._executor.after(name, callback);
  }
  
  @ifInvalid()
  on = (name, callback) => {
    if (this._invalid) {
      return;
    }
    this._emitter.on(name, callback);
    return () => {
      this._emitter.off(name, callback);
    }
  }
  
  @ifInvalid()
  fetch = (type, param = {}) => {
    const tempDataName = '' + Math.random();
    this._dataHub.doFetch(type, tempDataName, param, {});
    return new Promise((resolve) => {
      this.once('$fetchEnd:' + tempDataName, (data) => {
        resolve(data);
        this._dataHub.delete(tempDataName);
      });
    });
  }
  
  @ifInvalid()
  once = (name, callback) => {
    if (this._invalid) {
      return;
    }
    this._emitter.once(name, callback);
    return () => {
      this._emitter.off(name, callback);
    }
  }

  @ifInvalid()
  watch = (callback, _once = false) => {
    if (this._invalid) {
      return;
    }
    let fun = _once ? 'once' : 'on';
    
    const onChange = () => {
      if (this._invalid) {
        return;
      }
      clearTimeout(this._watchTimeoutIndex);
      this._watchTimeoutIndex = setTimeout(() => {
        callback();
      }, lagTime);  
    };

    this[fun]('$dataChange', onChange);
    this[fun]('$statusChange', onChange);
    
    callback();
  }
  
  _checkReady =  (name) => {
    if (this._invalid) {
      return {ready: false};
    }

    let dataList = [];
    for (let _name of name) {
      if (this._dataHub.status(_name) !== 'set') {
        return {ready: false};
      }  
      dataList.push(this._dataHub.get(_name));
    }
    
    return {
      ready: true,
      dataList
    }
  }

  @ifInvalid(blank)
  when = (name, callback, _once = false) => {
    if(Array.isArray(name)) {
      if(name.length === 0) {
        return blank;
      }
      
      let offList = [];

      const wrapedCallback = () => {
        
        const {
          ready,
          dataList
        } = this._checkReady(name);
        
        if(ready) {
          callback(dataList);
        }
      };
      
      const {
        ready,
        dataList
      } = this._checkReady(name);

      if(ready) {
        callback(dataList);
        if (_once) {
          return blank;
        }
      }

      let fun = _once ? 'once' : 'on';
      name.forEach(_name => {
        offList.push(this[fun](_name, wrapedCallback));
      });
      
      return () => {
        offList && offList.forEach(off => off());
        offList = null;
      };
    }
    
    return this._when(name, callback, _once);
  }
  
  @ifInvalid(blank)
  all = (name, callback) => {
    name = [].concat(name);
    
    let offList = [];
    let stop = false;

    const infiniteOnce = () => {
      if (this._invalid) {
        return;
      }
      
      Promise.all(name.map(_n => new Promise(r => {
       offList.push(this.once(_n, r));
      }))).then(()=>{      
        callback(this._checkReady(name).dataList);
        offList = [];
        (!stop) && infiniteOnce();
      });
    }
    infiniteOnce();
    
    const {
      ready,
      dataList
    } = this._checkReady(name);
    
    if (ready) {
      callback(dataList);
    }
    
    return () => {
      stop = true;
      offList.forEach(off => off());
    };
  }
  
  @ifInvalid(blank)
  _when = (name, callback, _once = false)  => {
    if(noValue(name)) {
      return blank;
    }
    
    let fun = _once ? 'once' : 'on';

    const wrapedCallback = () => {
      if (this._invalid) {
        return;
      }
      callback(this._dataHub.get(name));
    }
    
    if (this._dataHub.status(name) === 'set') {
        wrapedCallback();
        if (_once) {
          return blank;
        }
    }

    return this[fun](name, wrapedCallback);
  }
  
}

function toObjParam(param){
  if (noValue(param)) {
    return {};
  }
  if(typeof param !== 'object'){
    return {data: param};
  }
  return param;
}

function actionPlugn(dataName, configInfo, dh) {
  let {
    action = configInfo.type,
    dependence = [],
    lazy = false,
    filter = [],
    form = false,
    pagination = false,
  } = configInfo;

  if (noValue(action) || action === 'static') {
    return;
  }
  
  if (form) {
    lazy = true;
  }
  
  dependence = [].concat(dependence);
  
  if (pagination) {
    const dpName = dataName + 'Pagination';
    dependence = dependence.concat(dpName);
    
    const {
      data = 'data',
      total = 'total'
    } = typeof pagination === 'object' ?  pagination : DataHub.pagination;
    
    let value;
    if(dh._config[dpName] && dh._config[dpName].default){
      value = [].concat(dh._config[dpName].default)[0];
    }
    value = Object.assign((value || {}), {
      [total]: 0
    });
    dh.set(dpName, value);
    
    dh._controller.after('afterFetcher', (newResult, result, newArgs, args) => {
      if (args[1] === dataName) {
        dh._data[dpName][0][total] = newResult[total];
        return newResult[data];
      }
      return newResult;
    });
  }
  
  
  filter = [].concat(filter);

  const $fetch = () => {
    const param = dh._fetchParam[dataName] = dh._fetchParam[dataName] || {};

    for (let depName of dependence) {
      const depData = dh.get(depName);
      if(depData.length === 0) {
        if(dh.get(dataName).length !== 0) {
          dh.set(dataName, []);
        }
        return;
      }
      Object.assign(param, toObjParam(depData[0]));
    }
    
    for (let filterName of filter) {
      const filterData = dh.get(filterName);
      if(filterData.length === 0) {
        continue;
      }
      Object.assign(param, toObjParam(filterData[0]));
    }
    
    dh.doFetch(action, dataName, param, {form, pagination: !!pagination});

  }
  
  dh._executor.register('$refresh:' + dataName, $fetch);
  
  if(!lazy){
    if (dependence.length) {
      dh._controller.when(dependence, $fetch);  
    }
    
    if (filter.length) {
      filter.forEach(fName => dh._controller.when(fName, $fetch));
    }
    
    $fetch();
  }
}

const _dataHubPlugin = {
  action: actionPlugn,
  type: actionPlugn,
  default: (dataName, configInfo, dh) => {
    let {
      default: _default
    } = configInfo;
    
    if(_default !== undefined && !dh.get(dataName).length) {
      dh.set(dataName, snapshot(_default));
    }
  },
  reset: (dataName, configInfo, dh) => {
    let {
      reset,
      default: _default
    } = configInfo;

    if(reset !== undefined) {
      const doReset = (_default === undefined) ? () => {
        dh.set(dataName, []);
      } : () => {
        dh.set(dataName, snapshot(_default));
      };
      dh._controller.when(reset, doReset);
    }
  },
  clear: (dataName, configInfo, dh) => {
    let {
      clear
    } = configInfo;
    
    if(clear !== undefined) {
      dh._controller.when(clear, () => {
        dh.set(dataName, []);
      });
    }
  }
};

function _runDataConfigPlugn(cfg, name, info, ds) {
  _dataHubPlugin[cfg] && _dataHubPlugin[cfg](name, info, ds);
}

export class DataHub {
  constructor(config = {}, ControllerClass = Controller, ExecutorClass = Executor) {
    if (!_Emitter) {
      throw new Error('must implement Emitter first');
    }
    
    this.myKey = dataHubKey++;
    
    this._ControllerClass = ControllerClass;
    this._executor = new ExecutorClass();
    this._emitter = new _Emitter();
    this._controller = this.controller();
    this._lagFetchTimeoutIndex = {};
    this._data = {};
    this._status = {};
    this._fetchParam = {};
    this._config = config;

    this._controller.register('beforeFetcher', same);
    this._controller.register('afterFetcher', same);  
    
    this._init();
  }
  
  _init(){
    const config = this._config;
    for (let dataName in config) {
      const configInfo = config[dataName];
      for (let configName in configInfo){
        _runDataConfigPlugn(configName, dataName, configInfo, this);
      }      
    }
  }
  
  @ifInvalid()
  status(...args) {
    let [name, value] = args;
    if (args.length === 1){
      return this._status[name] || 'undefined';
    }
    if(statusList.indexOf(value) === -1){
      errorLog(`${name} status must be one of ${statusList.join(',')} but it is ${value}`);
      return;
    }
    if (value !== this._status[name]) {
      this._status[name] = value;
      this._emitter.emit('$statusChange', {name, value});
      this._emitter.emit('$statusChange:' + name, value);
    }
  }
  
  beforeSet(name, value) {
    return value;
  };
  
  @ifInvalid()
  set(name, value){
    if(this.status(name) === 'locked'){
      errorLog(`can not ${name} when locked`);
      return;
    }
    if(!this._validate(value)){
      value = [];
    }
    const data =  [].concat(value);
    value = this.beforeSet(name, value);
    if(this._checkChange(name, data)){
      this._data[name] = data;
      this.status(name, 'set');
      this._emitter.emit('$dataChange', {name,data});
      this._emitter.emit(name, data);
    } else {
      this.status(name, 'set');
    }
  }
  
  @ifInvalid(false)
  ready(list){
    return ([].concat(list)).reduce((a, b) => (a && this.status(b) === 'set'), true);
  }
  
  @ifInvalid(false)
  loading(list) {
    return ([].concat(list)).reduce((a, b) => (a || this.status(b) === 'loading'), false);
  }
  
  @ifInvalid()
  submit(name, param = {}) {
    const {
      data = {},
      lock = [],
      refresh = [],
      callback = blank
    } = param;
    
    if(!this.ready(name) && this.status(name) !== 'undefined'){
      errorLog(`${name} is not ready, can not be submited`);
      return;
    }

    const oldStatus = [].concat(lock).concat(refresh).map(lockName => {
      let old = this.status(lockName);
      this.status(lockName, 'locked');
      return {name: lockName, status: old};
    });
   
    this.set(name, data);
    this.refresh(name);
    
    const afterSubmit = (data) => {
      callback(data);
      oldStatus.forEach(({name, status}) => {
        this.status(name, status);
      });
      [].concat(refresh).forEach(refreshName => {
        this.refresh(refreshName);
      });
    }
    
    return new Promise((resolve, reject)=>{
      this._controller.once('$fetchEnd:' + name, (resultData) => {
        if(this.status(name) === 'error') {
          this.set(name, [])
          afterSubmit([]);
          reject([]);
        } else {
          afterSubmit(resultData)
          resolve(resultData);
        }
      });  
    });
  }
  
  @ifInvalid()
  emit(name, ...args){
    this._emitter.emit(name, ...args);
  }
  
  @ifInvalid()
  bind(that) {
    return DataHub.bind(this, that);
  }
  
  beforeGet(name, value){
    return value;
  }
  
  @ifInvalid()
  get(name) {
    return this.beforeGet(name, this._data[name] || []);
  }
  
  @ifInvalid()
  first(name) {
    const a = this.get(name)[0];
    if(a === undefined){
      return {};
    }
    return a;
  }
  
  @ifInvalid()
  assign0(name, obj) {    
    const newObj = Object.assign(this.first(name), obj);
    const data = this.get(name);
    data.splice(0, 1, newObj);
    this.set(name, data);
  }
  
  @ifInvalid()
  snapshot(from, to) {
    this.set(to, snapshot(this.get(from)));
  }
  
  @ifInvalid()
  reset(name) {
    const cfg = this._config[name];
    if(!cfg || cfg.default === undefined) {
      this.delete(name);
    } else {
      this.set(name, snapshot(cfg.default));
    }
  }
  
  @ifInvalid()
  delete(name) {
    delete this._data[name];
    delete this._status[name];
    this.status(name, 'undefined');
    this.emit('$dataChange',{name});
    this.emit('$delete', name);
  }
  
  @ifInvalid()
  refresh(name) {
    const $refresh = '$refresh:' + name;
    if(this._executor.has($refresh)){
      this._executor.run($refresh, true);
    } else {
      this._emitter.emit(name, this.get(name));
    } 
  }
  
  _checkChange() {
    return true;
  }
  
  _validate(value){
    if (value === undefined){
      errorLog(`${value} can not be undefined`);
      return false;
    }
    return true;
  }
  
  @ifInvalid()
  doFetch(type, name, param, extend = {}) {
    
    clearTimeout(this._lagFetchTimeoutIndex[name]);
    this._lagFetchTimeoutIndex[name] = setTimeout(() => {
      if (this._invalid) {
        return;
      }
      if(this.status(name) === 'loading') {
        errorLog(`${name} can not be fetched when loading`);
        return;
      }
      
      this.status(name, 'loading');      
      const param = this._fetchParam[name] || {};
      delete this._fetchParam[name];
      
      Promise.resolve()
      .then((param) => this._controller.run('beforeFetcher', param, name, this))
      .then((param) => DataHub.dh._controller.run('beforeFetcher', param, name, this))
      .then((newParam) => {
        if(newParam === stopRun || this._invalid) {
          return Promise.reject(stopRun);
        }
        return DataHub.dh._controller.run(type, {...extend, param, data: this.get(name)});
      })
      .then((result) => {
        return DataHub.dh._controller.run('afterFetcher', result, name ,this);
      })
      .then((result2) => {
        return this._controller.run('afterFetcher', result2, name , this);
      })
      .then((newResult) => {
        if (newResult === undefined) {
          newResult = [];
        } else {
          newResult = [].concat(newResult);
        }
        this.set(name, newResult);
        this.emit('$fetchEnd', newResult);
        this.emit('$fetchEnd:' + name, newResult);
      }).catch((e) => {
        if (this._invalid) {
          return;
        }
        if (e === stopRun) {
          this.status(name, 'set');
        } else {
          errorLog(e);
          if(!this._data[name]){
            this.set(name, []);
          }
          this.status(name, 'error');
          this.emit('$error', e);
          this.emit('$error:' + name, e);
          this.emit('$fetchEnd', e);
          this.emit('$fetchEnd:' + name, e);
        }
      }); 
    }, lagTime);   
  }
  
  @ifInvalid()
  controller() {
    return new this._ControllerClass(this);
  }
  
  @ifInvalid()
  destroy() {
    this._invalid = true;
    Object.keys(this._lagFetchTimeoutIndex).forEach(index => {
      clearTimeout(index);
    });
    this._emitter.emit('$storeDestroy', this._emitter);
    this._controller.destroy();
    this._executor.destroy();
    this._lagFetchTimeoutIndex = null;
    this._executor = null;
    this._emitter = null;
    this._config  = null;
    this._data  = null;
    this._status = null;
    this._fetchParam = null;
  } 
}

DataHub.addExtendPlugn = (name, callback) => {
  _dataHubPlugin.$[name] = callback;
}

DataHub.addConfigPlugn = (name, callback) => {
  _dataHubPlugin.c[name] = callback;
}

DataHub.instance = (config) => {
  return new DataHub(config);
}

DataHub.setEmitter = (Emitter) => {
  if(_Emitter) {
    errorLog('Emitter has implemented, who care!');
  }
  
  const _pe = Emitter.prototype;
  emitterMethods.forEach(name => {
    if(typeof _pe[name] !== 'function'){
      throw new Error(`Emitter must implement ${emitterMethods.join(',')}, but the Emitter do not implement ${name}.`);
    }
  });
  
  _Emitter = Emitter;

  DataHub.dh = DataHub.instance({}); 

  DataHub.dh._controller.register('beforeFetcher', same);
  DataHub.dh._controller.register('afterFetcher', same);  
  
  DataHub.addBeforeFetcher = (callback) => {
    DataHub.dh._controller.before('beforeFetcher', callback);
  }
  DataHub.addAfterFetcher = (callback) => {
    DataHub.dh._controller.after('afterFetcher', callback);
  }
  DataHub.addFetcher = (name, callback) => {   
    DataHub.dh._controller.register(name, callback);
  }
  
  ['get', 'set', 'assign0', 'first'].forEach(funName => {
    DataHub[funName] = (...args) => {
      return DataHub.dh[funName](...args);
    }
  });
}

DataHub.inject = blank;
DataHub.bind = blank;

DataHub.dhName = 'dh';
DataHub.pDhName = 'pDh';
DataHub.dhCName = 'dhController';
DataHub.pDhCName = 'pDhController';
DataHub.gDhCName = 'gDhController';
DataHub.pagination = {
  data: 'data',
  total: 'total'
};

DataHub.bindView = (dataHub, updateView = () => blank) => {
  return {
    doBind: (that) => {
      that[DataHub.pDhName] = dataHub;
      that[DataHub.pDhCName] = that[DataHub.pDhName].controller();
      that[DataHub.pDhCName].watch(() => updateView.call(that)); 
    },
    beforeDestroy: (that, beforeDestroy) => {
      beforeDestroy && beforeDestroy.apply(that);
      
      that[DataHub.pDhCName] && that[DataHub.pDhCName].destroy();      
      that[DataHub.pDhCName] = null;
    }
  }
};

DataHub.injectView = (config = null, updateView = () => blank, gDh = true) => {
  return {
    afterCreated: (that, afterCreated) => {
      const cfg = !noValue(config);
      if (cfg) {
        that[DataHub.dhName] = DataHub.instance(config);
        that[DataHub.dhCName] = that[DataHub.dhName].controller();
        that[DataHub.dhCName].watch(() => updateView.call(that)); 
      }
      
      if (gDh) {
        that[DataHub.gDhCName] = DataHub.dh.controller();
        that[DataHub.gDhCName].watch(() => updateView.call(that));
      }
      
      if((!cfg) && (!gDh)) {
        errorLog('not inject dataHub or globalDataHub, who care!')
      }

      afterCreated && afterCreated.apply(that);
    },
    beforeDestroy: (that, beforeDestroy) => {
      beforeDestroy && beforeDestroy.apply(that);
      
      that[DataHub.gDhCName] && that[DataHub.gDhCName].destroy();
      that[DataHub.dhName] && that[DataHub.dhName].destroy();
      
      that[DataHub.dhName] = null;
      that[DataHub.dhCName] = null; 
      that[DataHub.gDhCName] = null;
    }
  }
};

DataHub.setLagTime = (v)=> {
  lagTime = (+v) || 40;
}

