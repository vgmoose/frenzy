ig.module(
	'game.entities.enemy'
)
.requires(
	'impact.entity',
	'impact.font',
	'game.words',
	'game.entities.particle'
)
.defines(function(){

EntityEnemy = ig.Entity.extend({
	
	word: 'none',
	remainingWord: 'none',
	health: 8,
	currentLetter: 0,
	targeted: false,
	
	speed: 10,
	friction: {x: 100, y: 100},
	hitTimer: null,
	dead: false,
	angle: 0,
	
	wordLength: {min:8, max:8},
	
	soundHit: new ig.Sound('media/sounds/hit.ogg'),
	
	type: ig.Entity.TYPE.B,
	checkAgainst: ig.Entity.TYPE.A,
	
	init: function( x, y, settings ) {
		this.parent( x, y, settings );
		
		this.health = Math.random().map(0,1, this.wordLength.min, this.wordLength.max).round();
		this.word = this.getWordWithLength( this.health );
		this.remainingWord = this.word;
		this.hitTimer = new ig.Timer(0);
		this.dieTimer = new ig.Timer(0);		
		
		ig.game.registerTarget( this.fullKana(this.word), this );
		this.angle = this.angleTo( ig.game.player );
	},

	fullKana: function ( w ) {
		var smallKana = ['ゃ','ゅ','ょ','ャ','ュ','ョ','ィ','ェ','ァ','っ','ッ'];
		var numSmallKana = smallKana.length;
		for(var i = 0; i < numSmallKana; i++) {
			if( w.charAt(0) === smallKana[i] || (w.charAt(1) === smallKana[i] &&  i < numSmallKana - 2)) {
				return w.substr(0,2);
			}
		}
		return w.charAt(0);
	},
	
	getWordWithLength: function( l ) {
		var w = 'wtf';
		
		// try a few times to find a word with a unique first letter
		for( var i = 0; i < 20; i++ ) {
			if( l >= 2 && l <= 7 ) {
				w = ig.game.words[l].random();
			}
			else {
				w = ig.game.toListen[Math.floor(Math.random() * ig.game.toListen.length)][1];
			}
			
			if( !ig.game.targets[this.fullKana(w)].length ) {
				return w;
			}
		}
		
		return w;
	},
	
	target: function() {
		this.targeted = true;
		ig.game.currentTarget = this;
		ig.game.unregisterTarget( this.fullKana(this.word), this );
		
		// put this entity at the end/top
		ig.game.entities.erase(this);
		ig.game.entities.push(this);
	},
	
	draw: function() {
		ig.system.context.globalCompositeOperation = 'lighter';
		this.parent();
		ig.system.context.globalCompositeOperation = 'source-over';
	},
	
	drawLabel: function() {
		if( !this.remainingWord.length ) {
			return;
		}

		var word = this.remainingWord;
		var x = (this.pos.x-6).limit(2,ig.system.width-1);
		var y = (this.pos.y+this.size.y-10).limit(2,ig.system.height-19);

		var ctx = ig.system.context;

		ctx.font = 'bold 18px Meiryo';

		var w = ctx.measureText(word).width;
		var h = ctx.measureText(word).height;
		var bx = ig.system.getDrawPos(x-3);
		var by = ig.system.getDrawPos(y-18);
		
		if( this.targeted ) {
			ctx.fillStyle = '#fff';
			ctx.fillRect(bx, by, w+5, 21);	
			ctx.fillStyle = '#f32ba0';
		}
		else
		{
			ctx.fillStyle = 'rgba(0,0,0,0.3)';
			ctx.fillRect(bx, by, w+5, 42);
			ctx.fillStyle = '#fff';
		}
		
		ctx.fillText("fdafsd", x, y);
		ctx.fillText("ttjjt", y, x);
	},
	
	kill: function() {
		ig.game.unregisterTarget( this.fullKana(this.word), this );
		if( ig.game.currentTarget == this ) {
			ig.game.currentTarget = null;
		}
		this.parent();
	},
	
	update: function() {
		if( this.hitTimer.delta() > 0 ) {
			this.vel.x = Math.cos(this.angle) * this.speed;
			this.vel.y = Math.sin(this.angle) * this.speed;
		}
		
		this.parent();		
		
		// outside of the screen?
		if(
		   this.pos.x < -this.animSheet.width ||
		   this.pos.x > ig.system.width + 10 ||
		   this.pos.y > ig.system.height + 10 ||
		   this.pos.y < -this.animSheet.height - 30
		) {
			this.kill();
		}
	},
	
	
	hit: function() {		
		var numParticles = 10;
		
		for( var i = 0; i < numParticles; i++ ) {
			ig.game.spawnEntity( EntityExplosionParticle, this.pos.x, this.pos.y );
		}
		
		this.vel.x = -Math.cos(this.angle) * 20;
		this.vel.y = -Math.sin(this.angle) * 20;

		this.hitTimer.set(0.3);
		this.receiveDamage(1);
		ig.game.lastKillTimer.set(0.3);
		this.soundHit.play();

		if(this.remainingWord === '') {
			this.kill();
		}
	},
	
	
	isHitBy: function( letter ) {
		var fullKana = this.fullKana(this.remainingWord);
		console.log(fullKana.charAt(fullKana.length - 1));
		console.log(letter);
		if( fullKana == letter || fullKana.charAt(fullKana.length - 1) == letter ) {
			this.remainingWord = this.remainingWord.substr(fullKana.length);
		
			if( this.remainingWord.length == 0 ) {
				ig.game.currentTarget = null;
				ig.game.unregisterTarget( this.fullKana(this.word), this );
				this.dead = true;
			}
			return true;
		}
		else {
			return false;
		}
	},
	
	
	check: function( other ) {
		// must be the player
		ig.game.setKillWord(this.word);
		other.kill();
		this.kill();
	}
});



EntityExplosionParticle = EntityParticle.extend({
	lifetime: 0.5,
	fadetime: 0.5,
	vel: {x: 60, y: 60},
	
	animSheet: new ig.AnimationSheet( 'media/sprites/explosion.png', 32, 32 ),
		
	init: function( x, y, settings ) {
		this.addAnim( 'idle', 5, [0,1,2] );		
		this.parent( x, y, settings );
	},
	
	draw: function() {
		ig.system.context.globalCompositeOperation = 'lighter';
		this.parent();
		ig.system.context.globalCompositeOperation = 'source-over';	
	},
	
	update: function() {
		this.currentAnim.angle += 0.1 * ig.system.tick;
		this.parent();
	}
});
	
});
