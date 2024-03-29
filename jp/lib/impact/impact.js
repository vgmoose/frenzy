
// -----------------------------------------------------------------------------
// Impact Game Library 1.15
// http://impactjs.com/
// -----------------------------------------------------------------------------



// -----------------------------------------------------------------------------
// Native Object extensions

Number.prototype.map = function(istart, istop, ostart, ostop) {
	return ostart + (ostop - ostart) * ((this - istart) / (istop - istart));
};

Number.prototype.limit = function(min, max) {
	return Math.min(max, Math.max(min, this));
};

Number.prototype.round = function(precision) {
	precision = Math.pow(10, precision || 0);
	return Math.round(this * precision) / precision;
};

Number.prototype.floor = function() {
	return Math.floor(this);
};

Number.prototype.ceil = function() {
	return Math.ceil(this);
};

Number.prototype.toInt = function() {
	return (this | 0);
};

Array.prototype.erase = function(item) {
	for (var i = this.length; i--; i) {
		if (this[i] === item) this.splice(i, 1);
	}
	return this;
};

Array.prototype.random = function() {
	return this[ (Math.random() * this.length).floor() ];
};

Function.prototype.bind = function(bind) {
	var self = this;
	return function(){
		var args = Array.prototype.slice.call(arguments);
		return self.apply(bind || null, args);
	};
};



// -----------------------------------------------------------------------------
// ig Namespace

(function(window){

window.ig = {
	game: null,
	version: '1.15',
	global: window,
	modules: {},
	resources: [],
	ready: false,
	baked: false,
	nocache: '',
	ua: {},
	lib: 'lib/',
	
	_current: null,
	_loadQueue: [],
	_waitForOnload: 0,
	
	
	$: function( selector ) {
		return selector.charAt(0) == '#'
			? document.getElementById( selector.substr(1) )
			: document.getElementsByTagName( selector );
	},
	
	
	$new: function( name ) {
		return document.createElement( name );
	},
	
	
	copy: function( object ) {
		if(
		   !object || typeof(object) != 'object' ||
		   object instanceof HTMLElement ||
		   object instanceof ig.Class
		) {
			return object;
		}
		else if( object instanceof Array ) {
			var c = [];
			for( var i = 0, l = object.length; i < l; i++) {
				c[i] = ig.copy(object[i]);
			}
			return c;
		}
		else {
			var c = {};
			for( var i in object ) {
				c[i] = ig.copy(object[i]);
			}
			return c;
		}
	},
	
	
	merge: function( original, extended ) {
		for (var key in extended) {
			var ext = extended[key];
			if(
				typeof(ext) != 'object' ||
				ext instanceof HTMLElement ||
				ext instanceof ig.Class
			) {
				original[key] = ext;
			}
			else {
				if( !original[key] || typeof(original[key]) != 'object' ) {
					original[key] = {};
				}
				ig.merge( original[key], ext );
			}
		}
		return original;
	},
	
	
	ksort: function( obj ) {
		if( !obj || typeof(obj) != 'object' ) {
			return [];
		}
		
		var keys = [], values = [];
		for( var i in obj ) {
			keys.push(i);
		}
		
		keys.sort();
		for( var i = 0; i < keys.length; i++ ) {
			values.push( obj[keys[i]] );
		}
		
		return values;
	},
	
	
	module: function( name ) {
		if( ig._current ) {
			throw( "Module '"+ig._current.name+"' defines nothing" );
		}
		ig._current = {name: name, requires: [], loaded: false, body: null};
		ig.modules[name] = ig._current;
		ig._loadQueue.push(ig._current);
		ig._initDOMReady();
		return ig;
	},
	
	
	requires: function() {
		ig._current.requires = Array.prototype.slice.call(arguments);
		return ig;
	},
	
	
	defines: function( body ) {
		name = ig._current.name;
		ig._current.body = body;
		ig._current = null;
		ig._execModules();
	},
	
	
	addResource: function( resource ) {
		ig.resources.push( resource );
	},
	
	setNocache: function( set ) {
		ig.nocache = set
			? '?' + Math.random().toString().substr(2)
			: '';
	},
	
	
	_loadScript: function( name, requiredFrom ) {
		ig.modules[name] = {name: name, requires:[], loaded: false, body: null};
		ig._waitForOnload++;
		
		var path = ig.lib + name.replace(/\./g, '/') + '.js' + ig.nocache;
		var script = ig.$new('script');
		script.type = 'text/javascript';
		script.src = path;
		script.onload = function() {
			ig._waitForOnload--;
			ig._execModules();
		};
		script.onerror = function() {
			throw(
				'Failed to load module '+name+' at ' + path + ' ' +
				'required from ' + requiredFrom
			);
		};
		ig.$('head')[0].appendChild(script);
	},

	
	_execModules: function() {
		var modulesLoaded = false;
		for( var i = 0; i < ig._loadQueue.length; i++ ) {
			var m = ig._loadQueue[i];
			var dependenciesLoaded = true;
			
			for( var j = 0; j < m.requires.length; j++ ) {
				var name = m.requires[j];
				if( !ig.modules[name] ) {
					dependenciesLoaded = false;
					ig._loadScript( name, m.name );
				}
				else if( !ig.modules[name].loaded ) {
					dependenciesLoaded = false;
				}
			}
			
			if( dependenciesLoaded && m.body ) {
				ig._loadQueue.splice(i, 1);
				m.loaded = true;
				m.body();
				modulesLoaded = true;
				i--;
			}
		}
		
		if( modulesLoaded ) {
			ig._execModules();
		}
		
		// No modules executed, no more files to load but loadQueue not empty?
		// Must be some unresolved dependencies!
		else if( !ig.baked && ig._waitForOnload == 0 && ig._loadQueue.length != 0 ) {
			var unresolved = [];
			for( var i = 0; i < ig._loadQueue.length; i++ ) {
				
				// Which dependencies aren't loaded?
				var unloaded = [];
				var requires = ig._loadQueue[i].requires;
				for( var j = 0; j < requires.length; j++ ) {
					var m = ig.modules[ requires[j] ];
					if( !m || !m.loaded ) {
						unloaded.push( requires[j] );
					}
				}
				unresolved.push( ig._loadQueue[i].name + ' (requires: ' + unloaded.join(', ') + ')');
			}
			
			throw( 
				'Unresolved (circular?) dependencies. ' +
				"Most likely there's a name/path mismatch for one of the listed modules:\n" +			
				unresolved.join('\n')				
			);
		}
	},
	
	
	_DOMReady: function() {
		if( !ig.modules['dom.ready'].loaded ) {
			if ( !document.body ) {
				return setTimeout( ig._DOMReady, 13 );
			}
			ig.modules['dom.ready'].loaded = true;
			ig._waitForOnload--;
			ig._execModules();
		}
		return 0;
	},
	
	
	_boot: function() {
		if( document.location.href.match(/\?nocache/) ) {
			ig.setNocache( true );
		}
		
		// Probe user agent string
		ig.ua.pixelRatio = window.devicePixelRatio || 1;
		ig.ua.viewport = {
			width: window.innerWidth,
			height: window.innerHeight
		};
		ig.ua.screen = {
			width: window.screen.availWidth * ig.ua.pixelRatio,
			height: window.screen.availHeight * ig.ua.pixelRatio
		};
		
		ig.ua.iPhone = /iPhone/i.test(navigator.userAgent);
		ig.ua.iPhone4 = (ig.ua.iPhone && ig.ua.pixelRatio == 2);
		ig.ua.iPad = /iPad/i.test(navigator.userAgent);
		ig.ua.android = /android/i.test(navigator.userAgent);
		ig.ua.iOS = ig.ua.iPhone || ig.ua.iPad;
		ig.ua.mobile = ig.ua.iOS || ig.ua.android;
	},
	
	
	_initDOMReady: function() {
		if( ig.modules['dom.ready'] ) { return; }
		
		ig._boot();
		
		
		ig.modules['dom.ready'] = { requires: [], loaded: false, body: null };
		ig._waitForOnload++;
		if ( document.readyState === 'complete' ) {
			ig._DOMReady();
		}
		else {
			document.addEventListener( 'DOMContentLoaded', ig._DOMReady, false );
			window.addEventListener( 'load', ig._DOMReady, false );
		}
	},
};


// -----------------------------------------------------------------------------
// Class object based on John Resigs code; inspired by base2 and Prototype
// http://ejohn.org/blog/simple-javascript-inheritance/

var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\bparent\b/ : /.*/;

window.ig.Class = function(){};
window.ig.Class.extend = function(prop) {
	var parent = this.prototype;
 
	initializing = true;
	var prototype = new this();
	initializing = false;
 
	for( var name in prop ) {
		if( 
			typeof(prop[name]) == "function" &&
			typeof(parent[name]) == "function" && 
			fnTest.test(prop[name])
		) {
			prototype[name] = (function(name, fn){
				return function() {
					var tmp = this.parent;
					this.parent = parent[name];
					var ret = fn.apply(this, arguments);			 
					this.parent = tmp;
					return ret;
				};
			})(name, prop[name]) 
		}
		else {
			prototype[name] = prop[name];
		}
	}
 
	function Class() {
		if( !initializing ) {
			
			// If this class has a staticInstantiate method, invoke it
			// and check if we got something back. If not, the normal
			// constructor (init) is called.
			if( this.staticInstantiate ) {
				var obj = this.staticInstantiate.apply(this, arguments);
				if( obj ) {
					return obj;
				}
			}
			for( p in this ) {
				this[p] = ig.copy(this[p]); // deep copy!
			}
			if( this.init ) {
				this.init.apply(this, arguments);
			}
		}
		return this;
	}
	
	Class.prototype = prototype;
	Class.constructor = Class;
	Class.extend = arguments.callee;
	
	return Class;
};

})(window);



// -----------------------------------------------------------------------------
// The main() function creates the system, input, sound and game objects,
// creates a preloader and starts the run loop

ig.module(
	'impact.impact'
)
.requires(
	'dom.ready',
	'impact.loader',
	'impact.system',
	'impact.input',
	'impact.sound'
)
.defines(function(){
	
ig.main = function( canvasId, gameClass, fps, width, height, scale, loaderClass ) {
	ig.system = new ig.System( canvasId, fps, width, height, scale || 1 );
	ig.input = new ig.Input();
	ig.soundManager = new ig.SoundManager();
	ig.music = new ig.Music();
	ig.ready = true;
	
	var loader = new (loaderClass || ig.Loader)( gameClass, ig.resources );
	loader.load();
};

});