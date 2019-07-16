(function (name, factory) {
	if(typeof define === 'function' && define.amd !== undefined){
		define(name, {}, function () {
			return factory;
		});
	}else if(typeof module === 'object' && typeof module.exports === 'object'){
		module.exports = factory;
	}else{
		window[name] = factory;
	}
}('formBinder',function (){
	
	var 
		__REGEXP_ID = /\sbind\=|\sv-bind=/g,
		__hasProp = Object.prototype.hasOwnProperty
	;
	
	var formBinder = function (option) {
		this.init(option);
		return this.callee;
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
		

		console.log(this);
	}
	
	formBinder.prototype.optionValidator = function (option) {
		if( option == undefined ){
			this.throwError('syntax', 'constructor property is not define');
		} else
		if( typeof option !== 'object' ){
			this.throwError('type', 'constructor property is not object');
		} else
		if( !option.hasOwnProperty('id') ){
			this.throwError('syntax', 'constructor property is required: "id"');
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
		this.__dataObject__['proxy'] = option.data || {};
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
	
	formBinder.prototype.throwError = function (type, message) {
		message = '[formBinder] ' + message;
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
	}
	
	formBinder.prototype.initHostObject = function (option) {
		this.setHostObject('eventHandler', option.eventHandler);
		this.setHostObject('formatter', option.formatter);
		this.setHostObject('method', option.method);
		this.setHostObject('scope', option.method);
		this.__hostObject__['scope'].id = option.id;
		this.__hostObject__['scope'].schema = option.schema;
		this.__hostObject__['scope'].data = this.__dataObject__['proxy'];
	}
	
	formBinder.prototype.setHostObject = function (type, fns) {
		for(var key in fns){
			/**
			 * 각 호스트 메소드의 현재 스코프는 자기자신(폼바인더)의 인스턴스를 가리킨다.
			 * 현재 스코프 객체는 자기자신의 id, schema, method 들로 구성되어 있다. 
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
			this.setElementObjectProperty(type, els[i]);
			this.addHostPropertyToElement(els[i]);
			this.initDataObject(type, els[i]);
		}
	}
	
	formBinder.prototype.setElementObjectProperty = function (type, el) {
		var elementObject = this.__elementObject__[type];
		var key = el.getAttribute(type);
		if( !__hasProp.call(elementObject, key) ){
			elementObject[key] = [];
		}
		elementObject[key].push(el);
	}
	
	formBinder.prototype.addHostPropertyToElement = function (el) {
		this.addFormatter(el);
		var attrs = el.attributes;
		var i, len=attrs.length;
		for(i=0; i<len; i++){
			this.addEvent(el, attrs[i].name, attrs[i].value);
		}
	}
	
	formBinder.prototype.addFormatter = function (el) {
		if( !el.hasAttribute('@fmt') ){
			el['@fmt'] = function () {};
			return;
		}
		
		var formatterNm = el.getAttribute('@fmt');
		try {
			el['@fmt'] = this.__hostObject__['formatter'][formatterNm];
		} catch(e) {
			this.throwError('type', '"' + formatterNm + '" is not found in formatter');
		}
	}
	
	formBinder.prototype.addEvent = function (el, evtNm, evtHandlerNm) {
		if( !__hasProp.call(el, '@event') ){
			el['@event'] = Object.create(null);
		}
		if( evtNm.indexOf('@') === -1 || evtNm === '@fmt' ){
			return;
		}
		evtNm = evtNm.replace('@','');
		try {
			/**
			 * 이 요소가 dom에서 제거될 때 이 곳에서 선언한 이벤트리스너를 지우기 위해 필요한 정보를 요소 속성에 담아둔다.
			 */
			el['@event'][evtNm] = this.__hostObject__['eventHandler'][evtHandlerNm];
			el.addEventListener(evtNm, el['@event'][evtNm]);
		} catch(e) {
			this.throwError('type', '"' + evtHandlerNm + '" is not found in eventHandler');
		}
	}
	
	formBinder.prototype.initDataObject = function (type, el) {
		var dataProxyObject = this.__dataObject__['proxy'];
		var key = el.getAttribute(type);
		if( !__hasProp.call(dataProxyObject, key) ){
			dataProxyObject[key] = ( el.value == undefined ) ? '' : el.value ;
		}
		this.setElementValue(el, '00');
		this.setElementFmtValue(el, '00');
	}
	
	
	formBinder.prototype.setElementValue = function (el, value) {
		el['@value'] = value;
	}
	
	formBinder.prototype.setElementFmtValue = function (el, value) {
		el['@value-fmt'] = el['@fmt'](value) || value;
	}
	
	
	return formBinder;
}()));
