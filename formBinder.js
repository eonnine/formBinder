(function (name, factory) {
	if(typeof define === 'function' && define.modular !== undefined){
		define(name, {}, function () {
			return factory;
		});
	}else if(typeof module === 'object' && typeof module.exports === 'object'){
		module.exports = factory;
	}else{
		window[name] = factory;
	}
}('formBinder',function (){ 'use strict'
	
	
	var 
		__inputDefaultNumber = 0,
		__REGEXP_NUMBER = /[^0-9.]/g,
		__REGEXP_ID = /\sbind\=|\sv-bind=/g,
		__hasProp = Object.prototype.hasOwnProperty,
		__getDefaultValidation = function () {
			return {
				type: 'string',
				maxLength: -1
			};
		},
		__definePropertyToReadOnly = function (target, key) {
			Object.defineProperty(target, key, {
				configurable: false,
				enumerable: false,
				writable: false
			});
		}
	;
	
	var formBinder = function (option) {
		this.init(option);
		return this;
		//return this.callee;
	}
	
	formBinder.prototype.init = function (option) {
		/*
		 * 생성자 파라미터를 검증
		 */
		this.optionValidator(option);
		/**
		 * dom-object 바인딩에 필요한 속성 생성
		 */
		this.createBindProperty(option);

		/**
		 * 사용자 정의 함수들 초기화
		 */
		this.initHostObject(option);
		/**
		 * 바인딩 객체 초기화
		 * 요소에 포매팅된 기본값의 초기화 작업을 수행하는 로직이 존재하기 때문에
		 * 호스트 객체가 생성된 후에 호출되어야 한다.
		 */
		this.initElementObject(option);
		
		/**
		 * 폼바인더 객체 생성시 반환해줄 callee 생성
		 */
		this.createCallee();

		this.setDefault();
	}
	
	formBinder.prototype.optionValidator = function (option) {
		if( option == undefined ){
			this.throwError('syntax', 'constructor parameter is required');
		} else
		if( typeof option !== 'object' ){
			this.throwError('type', 'constructor parameter must be object');
		} else
		if( !option.hasOwnProperty('id') ){
			this.throwError('syntax', '[constructor parameter] property is required: "id"');
		}
		
		if( option.hasOwnProperty('validation') ){
			if( Array.isArray(option['validation']) ){
				( option.validation[0] === undefined ) ? {} : option.validation[0];
				( option.validation[1] === undefined ) ? function () {} : option.validation[1];
			} else {
				this.throwError('syntax', '[constructor parameter] property must be array: "validation"');
			}
		}
	}
	
	formBinder.prototype.createBindProperty = function (option) {
		/**
		 * 실제 폼데이터가 세팅될 객체 생성
		 */
		this.__dataObject__ = Object.create(null);
		this.__dataObject__['data'] = {};
		/**
		 * form과 실제 데이터가 저장되는 객체를 이어주는 프록시 객체 생성
		 * data에서 포매팅된 값을 저장하는 등의 역할에 이용함
		 */
		this.__dataObject__['proxy'] = ( typeof option.data === 'object' && option.data) ? option.data : {};
		/**
		 * 바인딩 대상의 element를 담을 객체 생성
		 */
		this.__elementObject__ = Object.create(null);
		this.__elementObject__['bind'] = Object.create(null);
		this.__elementObject__['v-bind'] = Object.create(null);
		/**
		 * 각 바인더 인스턴스의 이벤트 핸들러, 포매팅, 호스트 객체를 담을 객체 생성
		 */
		this.__hostObject__ = Object.create(null); 
		this.__hostObject__['eventHandler'] = Object.create(null);
		this.__hostObject__['formatter'] = Object.create(null);
		this.__hostObject__['method'] = Object.create(null);
		this.__hostObject__['scope'] = Object.create(null);
	}
	
	formBinder.prototype.createCallee = function () {
		this.callee = {};
	}
	
	formBinder.prototype.throwError = function (type, message, isThrow) {
		message = '[formBinder] ' + message;
		isThrow = ( isThrow === undefined ) ? true : isThrow;

		if(isThrow){
			switch (type) {
			case 'error':
					throw new Error(message);
				break;
			case 'syntax':
				throw new SyntaxError(message);
				break;
			case 'type':
				throw new TypeError(message);
				break;
			case 'range':
				throw new RangeError(message);
				break;
			}
		} else {
			console.warn(message);
		}
	}
	
	formBinder.prototype.initHostObject = function (option) {
		this.setHostObject('eventHandler', option.eventHandler);
		this.setHostObject('formatter', option.formatter);
		this.setHostObject('method', option.method);
		this.setHostObject('scope', option.method);

		this.__hostObject__['validation'] = option.validation[0];
		this.__hostObject__['validFn'] = option.validation[1];
		__definePropertyToReadOnly(this.__hostObject__, 'validation');
		
		this.__hostObject__['scope'].id = option.id;
		this.__hostObject__['scope'].validation = this.__hostObject__['validation'];
		this.__hostObject__['scope'].data = this.__dataObject__['proxy'];
	}
	
	formBinder.prototype.setHostObject = function (type, fns) {
		for(var key in fns){
			/**
			 * 각 호스트 메소드의 현재 스코프는 자기자신(폼바인더)의 인스턴스를 가리킨다.
			 * 현재 스코프 객체는 자기자신의 id, validation, method 들로 구성되어 있다. 
			 */
			this.__hostObject__[type][key] = fns[key].bind(this.__hostObject__['scope']);
		}
	}
	
	formBinder.prototype.initElementObject = function (option) {
		var form = document.getElementById(option.id);
		this.setElementObject(form, 'bind');
		this.setElementObject(form, 'v-bind');
	}
	
	formBinder.prototype.setElementObject = function (form, type) {
		var els = form.querySelectorAll('[' + type + ']');
		var i, len=els.length;
		for(i=0; i<len; i++){
			/**
			 * bind 속성과 v-bind 속성이 저부 있다면 bind 속성만 적용
			 */
			this.initHostValidation(els[i], type);
			this.checkOverlapBindProperty(els[i]);
			this.setElementObjectProperty(els[i], type);
			this.addHostPropertyToElement(els[i]);
			this.initDataObject(els[i], type);
			this.addEvent(els[i]);
		}
	}
	
	formBinder.prototype.initHostValidation = function (el, type) {
		var validation = this.__hostObject__['validation'];
		var key = el.getAttribute(type);
		
		if( !__hasProp.call(validation, key) ){
			validation[key] = __getDefaultValidation(); 
		}
	}
	
	formBinder.prototype.addEvent = function (el) {
		el.addEventListener('focusin', this.editBeginEventListener, false);
		el.addEventListener('input', this.inputEventListener, false);
		el.addEventListener('focusout', this.editEndEventListener, false);
	}

	formBinder.prototype.editBeginEventListener = function (e) {
		e.preventDefault();
		e.stopPropagation();
		
		e.target['@prop']['@isEditing'] = true;
		
		if(e.target['@prop']['@valid'].type === 'number' && e.target['@prop']['@value'] === __inputDefaultNumber){
			e.target.value = '';
		} else {
			e.target.value = e.target['@prop']['@value'];
		}
	};
	
	formBinder.prototype.inputEventListener = function (e) {
		e.preventDefault();
		e.stopPropagation();
		e.target['@prop']['@data'][e.target['@prop']['@bind']] = e.target.value;
		e.target.value = e.target['@prop']['@value'];
	};
	
	formBinder.prototype.editEndEventListener = function (e) {
		e.preventDefault();
		e.stopPropagation();
		e.target['@prop']['@isEditing'] = false;
		e.target['@prop']['@data'][e.target['@prop']['@bind']] = e.target.value;
		e.target.value = e.target['@prop']['@value-fmt'];
	};
	
	formBinder.prototype.checkOverlapBindProperty = function (el) {
		if( el.hasAttribute('bind') && el.hasAttribute('v-bind') ){
			el.removeAttribute('v-bind');
		}
	}
	
	formBinder.prototype.setElementObjectProperty = function (el, type) {
		var elementObject = this.__elementObject__[type];
		var key = el.getAttribute(type);
		if( !__hasProp.call(elementObject, key) ){
			elementObject[key] = [];
		}
		elementObject[key].push(el);
	}
	
	formBinder.prototype.addHostPropertyToElement = function (el) {
		el['@prop'] = Object.create(null);
		
		this.addFormatterPropertyToElement(el);
		var attrs = el.attributes;
		var i, len=attrs.length;
		for(i=0; i<len; i++){
			this.addKeyPropertyToElement(el, attrs[i].name, attrs[i].value);
			this.addEventPropertyToElement(el, attrs[i].name, attrs[i].value);
		}
		
		__definePropertyToReadOnly(el, '@prop');
		
	}
	
	formBinder.prototype.addFormatterPropertyToElement = function (el) {
		var elProp = el['@prop'];
		if( !el.hasAttribute('@fmt') ){
			elProp['@fmt'] = function () {};
			return;
		}
		
		var formatterNm = el.getAttribute('@fmt');
		try {
			elProp['@fmt'] = this.__hostObject__['formatter'][formatterNm];
		} catch(e) {
			this.throwError('type', '"' + formatterNm + '" is not found in formatter');
		}
	}
	
	formBinder.prototype.addKeyPropertyToElement = function (el, propNm, propValue) {
		if( propNm === 'bind' || propNm === 'v-bind' ){
			var elProp = el['@prop'];
			elProp['@bind'] = propValue;
			elProp['@isEditing'] = false;
			elProp['@data'] = this.__dataObject__['proxy'];
			elProp['@valid'] = this.__hostObject__['validation'][propValue] || {};
			elProp['@isValue'] = 
			( el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' )
  	   ? true 
  	   : false
			;	
		}
	}
	
	formBinder.prototype.addEventPropertyToElement = function (el, evtNm, evtHandlerNm) {
		var elProp = el['@prop'];
		if( !__hasProp.call(elProp, '@event') ){
			elProp['@event'] = Object.create(null);
		}
		if( evtNm.indexOf('@') === -1 || evtNm === '@fmt' ){
			return;
		}
		evtNm = evtNm.replace('@','');
		try {
			/**
			 * 이 요소가 dom에서 제거될 때 이 곳에서 선언한 이벤트리스너를 지우기 위해 필요한 정보를 요소 속성에 담아둔다.
			 */
			elProp['@event'][evtNm] = this.__hostObject__['eventHandler'][evtHandlerNm];
			el.addEventListener(evtNm, elProp['@event'][evtNm]);
		} catch(e) {
			this.throwError('type', '"' + evtHandlerNm + '" is not found in eventHandler');
		}
	}
	
	formBinder.prototype.initDataObject = function (el, type) {
		var dataObject = this.__dataObject__['data'];
		var dataProxyObject = this.__dataObject__['proxy'];
		var key = el.getAttribute(type);
		
		if( !__hasProp.call(dataObject, key) ){
			/**
			 * 인자로 받은 data 객체의 각 속성값이 있는지 체크한 뒤
			 * 값이 있으면 기본값으로 초기화, 없으면 빈 값으로 초기화
			 */
			dataProxyObject[key] = ( dataProxyObject[key] != undefined ) ? dataProxyObject[key] : '';
			dataObject[key] = dataProxyObject[key]; 
			this.defineDataProxyProperty(el, key, dataProxyObject);
		}
		
		this.addValuePropertyToElement(dataProxyObject[key], el['@prop'], el['@prop']['@valid']);
	}
	
	formBinder.prototype.defineDataProxyProperty = function (el, propNm, dataProxyObject) {
		/**
		 * @Todo 메모리 누수 체크
		 * 데이터 프록시 객체에 get, set 함수를 정의
		 * 폼요소에서 input 이벤트리스너에서 프록시객체에 값을 할당할 때 set 메소드가 실행
		 * 프록시 객체에서 데이터를 호출할 때 get 메소드가 실행
		 */
		var _this = this;
		var dataObject = _this.__dataObject__['data'];
		Object.defineProperty(dataProxyObject, propNm, {
			get: function () {
				return dataObject[propNm];
			},
			set: function (v) {
				console.log(v);
				console.log(_this.__dataObject__);
				_this.eachBindElementForSetValue(propNm, v, 'bind');
				_this.eachBindElementForSetValue(propNm, v, 'v-bind');
			}
		});
	}

	formBinder.prototype.setDefault = function () {
		this.allEachBindElementForSetValue('bind');
		this.allEachBindElementForSetValue('v-bind');
	}
	
	formBinder.prototype.allEachBindElementForSetValue = function (type) {
		var bindElement = this.__elementObject__[type];
		var data = this.__dataObject__['proxy'];
		var i, len;
		for(var k in bindElement){
			len=bindElement[k].length
			for(i=0; i<len; i++){
				this.setValueToElement(type, bindElement[k][i], bindElement[k][i]['@prop']);
			}
		}
	}
	
	formBinder.prototype.eachBindElementForSetValue = function (key, value, type) {
		var elementArray = this.__elementObject__[type][key];

		if( elementArray === undefined){
			return; 
		}
		var data = this.__dataObject__['proxy'];
		var newValue, i, len=elementArray.length;
		
		/**
		 * 각 요소의 바인딩 속성을 새로운 값으로 갱신한 뒤 포매팅값으로 값 세팅
		 */
		for(i=0; i<len; i++){
			newValue = this.addValuePropertyToElement(value, elementArray[i]['@prop'], elementArray[i]['@prop']['@valid']);
			this.setValueToElement(type, elementArray[i], elementArray[i]['@prop']);
		}
		
		this.__dataObject__['data'][key] = newValue; 
	}
	
	formBinder.prototype.addValuePropertyToElement = function (value, elProp, valid) {
		elProp['@value'] = this.validValue(elProp, valid, value);
		elProp['@value-fmt'] = this.validValue(elProp, valid, elProp['@fmt'](value) || value);
		return elProp['@value']; 
	}
	
	formBinder.prototype.setValueToElement = function (type, el, elProp) {
		if(elProp['@isEditing'] === true){
			return;
		}
		
		if( elProp['@isValue'] === true ) {
			el.value = elProp['@value-fmt'];
		} else {
			el.textContent = elProp['@value-fmt'];
		}
	}
	
	formBinder.prototype.validValue = function (elProp, valid, value){
		value = String(value);
		
		if( valid.maxLength > 0 && value.length > valid.maxLength ){
			//this.throwError('range', '"' + elProp['@bind'] + '" must be less than ' + valid.maxLength + ': ' + value, false);
			value = value.substring(0, valid.maxLength);
		}
		
		switch(valid.type){
			case 'number':
				/**
				 * 유효 타입이 숫자인 경우 숫자와 [.]를 제외한 문자는 제거.
				 */
				value = value.toString().replace(__REGEXP_NUMBER, '');
				/*
				 * 현재 입력중이 아닐 때, 
				 * 값이 없으면 기본값인 0으로 입력 처리.
				 * 값이 있으면 해당 값을 실수 변환 처리.
				 */
				if(elProp['@isEditing'] === false){
					value = ( value === '' ) ? __inputDefaultNumber : parseFloat(value);
				}
				break;
			default :
				break;
		}
		
		return value;
	}
	
	formBinder.prototype.getData = function (){
		var newData = {};
		var data = this.__dataObject__['proxy'];
		for(var k in data){
			newData[k] = data[k];
		}
		return newData;
	}
	
	formBinder.prototype.setData = function (data){
		var originData = this.__dataObject__['proxy'];
		for(var k in data){
			originData[k] = data[k];
		}
	}
	
	formBinder.prototype.clear = function (){
		var originData = this.__dataObject__['proxy'];
		for(var k in data){
			originData[k] = '';
		}
	}
	
	return formBinder;
}()));
