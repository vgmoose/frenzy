ig.module(
	'game.entities.enemy-oppressor'
)
.requires(
	'game.entities.enemy'
)
.defines(function(){

EntityEnemyOppressor = EntityEnemy.extend({
	size: {x: 36, y: 58},
	offset: {x: 16, y: 10},
	animSheet: new ig.AnimationSheet( 'media/sprites/oppressor.png', 68, 88 ),
	
	health: 10,
	speed: 15,
	shootTimer: null,
	bullets: 16,
	
	wordLength: {min:9, max:12},
	
	init: function( x, y, settings ) {
		this.parent( x, y-18, settings );
		this.addAnim( 'idle', 1, [0] );
		
		this.shootTimer = new ig.Timer(7);
		this.angle = Math.PI/2;
	},
	
	
	update: function() {		
		this.parent();

		
		if( this.shootTimer.delta() > 0 ) {
			var inc = 140 / (this.bullets-1);
			var a = 20;
			var radius = 21;
			for( var i = 0; i < this.bullets; i++ ) {
				var angle = a * Math.PI/180;
				var x = this.pos.x + 18 + Math.cos(angle) * radius;
				var y = this.pos.y + 48 + Math.sin(angle) * radius;
				ig.game.spawnEntity( EntityEnemyBullet, x, y, {angle: angle} );
				a += inc;
			}
			
			this.shootTimer.reset();			
		}
	}
});


EntityEnemyBullet = EntityEnemy.extend({
	size: {x: 2, y: 2},
	offset: {x: 8, y: 11},
	animSheet: new ig.AnimationSheet( 'media/sprites/bullet.png', 20, 24 ),
	
	health: 1,
	speed: 50,
	
	wordLength: {min:1, max:1},
	
	init: function( x, y, settings ) {
		this.parent( x, y, settings );
		this.addAnim( 'idle', 1, [0] );
		this.angle = settings.angle;
		this.currentAnim.angle = this.angle - Math.PI/2;
	}
});
	
});