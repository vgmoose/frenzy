ig.module( 
	'game.main' 
)
.requires(
	'impact.game',
	'impact.font',
	
	'game.menus',
	'game.entities.enemy-missle',
	'game.entities.enemy-mine',
	'game.entities.enemy-destroyer',
	'game.entities.enemy-oppressor',
	'game.entities.player',
	
	'plugins.impact-splash-loader'
)
.defines(function(){

Number.zeroes = '000000000000';
Number.prototype.zeroFill = function( d ) {
	var s = this.toString();
	return Number.zeroes.substr(0,d-s.length) + s;
};


ZType = ig.Game.extend({
	
	font: new ig.Font( 'media/fonts/museo-18.png' ),
	fontScore: new ig.Font( 'media/fonts/04b03-mono-digits.png' ),
	fontTitle: new ig.Font( 'media/fonts/museo-48.png' ),	
	fontSelected: new ig.Font( 'media/fonts/museo-18-pink.png' ),

	logoImg: new ig.Image( 'media/logo.png', 250, 90 ),
	
	spawnTimer: null,
	targets: {},
	currentTarget: null,
	yScroll: 0,
	
	backdrop: new ig.Image('media/background/backdrop.png'),
	grid: new ig.Image('media/background/grid.png'),
	music: new ig.Sound('media/music/endure.ogg', false),
	
	menu: null,
	mode: 0, // TITLE
	score: 0,
	streak: 0,
	hits: 0,
	misses: 0,
	multiplier: 1,
	wave: {},
	gameTime: 0,
	kills: 0,

	killWord: '',
	neededKeys: '',

	tempString: '',

	script: 'HIRAGANA',
	
	difficulty: 'NORMAL',
	
	
	init: function() {		
		var bgmap = new ig.BackgroundMap( 400, [[1]], this.grid );
		bgmap.repeat = true;
		this.backgroundMaps.push( bgmap );
		
		ig.music.add( this.music );		
		
		window.addEventListener('keydown', this.keydown.bind(this), false );
		ig.input.bind( ig.KEY.ENTER, 'ok' );
		ig.input.bind( ig.KEY.SPACE, 'ok' );
		ig.input.bind( ig.KEY.MOUSE1, 'click' );
		ig.input.bind( ig.KEY.BACKSPACE, 'void' );
		ig.input.bind( ig.KEY.ESC, 'menu' );
		ig.input.bind( ig.KEY.UP_ARROW, 'up' );
		ig.input.bind( ig.KEY.DOWN_ARROW, 'down' );
		ig.input.bind( ig.KEY.LEFT_ARROW, 'left' );
		ig.input.bind( ig.KEY.RIGHT_ARROW, 'right' );
		
		this.setTitle();
		window.focus();
		ig.system.canvas.onclick = function(){ window.focus(); };
	},
	
	
	
	reset: function() {
		// kill all entities if there are any
		this.entities = [];
		this.currentTarget  = null;
		
		this.wave = ig.copy( ZType.WAVES[this.difficulty] );
		this.toListen = ZType.TOLISTEN[this.script];
		this.words = ZType.WORDS[this.script];
		
		// empty hash of targets for each letter
		var numKana = this.toListen.length;
		for( var i = 0; i < numKana; i++ ) {
			this.targets[this.toListen[i][1]] = [];
		}

		this.score = 0;
		this.rs = 0;
		this.streak = 0;
		this.hits = 0;
		this.misses = 0;
		this.kills = 0;
		this.multiplier = 1;
		this.gameTime = 0;
		
		this.lastKillTimer = new ig.Timer();
		this.spawnTimer = new ig.Timer();
		this.waveEndTimer = null;
	},
	
	
	
	
	// -------------------------------------------------------------------------
	// Wave
	
	nextWave: function() {
		this.wave.wave++;
		this.wave.spawnWait = (this.wave.spawnWait * 0.97).limit(0.2, 1);
		this.wave.spawn = [];
			
		var dec = 0;
		for( var t = 0; t < this.wave.types.length; t++ ) {
			var type = this.wave.types[t];
			type.count -= dec;
			if( this.wave.wave % type.incEvery == 0) {
				type.count++;
				dec++;
			}
			for( var s = 0; s < type.count; s++ ) {
				this.wave.spawn.push(t);
			}
		}
		this.wave.spawn.sort(function(){return Math.random()-0.5; });
	},
	
	
	spawnCurrentWave: function() {
		
		// all enemies for this wave spawned?
		if( !this.wave.spawn.length ) {
			
			// wait for death
			if( this.entities.length <= 1 && !this.waveEndTimer ) {
				this.waveEndTimer = new ig.Timer(2);
			}
			else if( this.waveEndTimer && this.waveEndTimer.delta() > 0 ) {
				this.waveEndTimer = null;
				this.nextWave();
			}
		}
		
		// spawn enemy?
		else if( this.spawnTimer.delta() > this.wave.spawnWait ) {
			this.spawnTimer.reset();
			
			var type = this.wave.types[this.wave.spawn.pop()].type;
			var x = Math.random().map(0,1,10, ig.system.width-10);
			var y = -30;
			this.spawnEntity( type, x, y, {healthBoost: this.wave.healthBoost} );
		}
	},	
	
	
	
	
	
	// -------------------------------------------------------------------------
	// Targeting/Shooting
	
	registerTarget: function( letter, ent ) {
		this.targets[letter].push( ent );
	},
	
	
	unregisterTarget: function( letter, ent ) {
		this.targets[letter].erase( ent );
	},
	
	
	keydown: function( event ) {
		if(
		   event.target.type == 'text' ||
		   event.ctrlKey || event.shiftKey || event.altKey ||
		   this.mode != ZType.MODE.GAME ||
		   this.menu
		) { return true; }
		
		var c = event.which;
		if( !((c > 64 && c < 91) || (c > 96 && c < 123) || c === 189 || c === 109 || c === 45) ) { // from A-Z or a-z or -
			return true;
		}
		
		event.stopPropagation();
		event.preventDefault();
		var letter = (c === 189 || c === 109 || c === 45) ? '-' : String.fromCharCode(c).toLowerCase(); // hyphen can be 189, 109, 45

		this.tempString += letter;

		for ( var j = 0; j < this.toListen.length; j++ ) {
			if( this.tempString.indexOf(this.toListen[j][0]) != -1 ) {
				if( !this.currentTarget ) {
					var potentialTargets = this.targets[this.toListen[j][1]];
					
					var nearestDistance = -1;
					var nearestTarget = null;
				
					for( var i = 0; i < potentialTargets.length; i++ ) {
						var distance = this.player.distanceTo( potentialTargets[i] );
						if( distance < nearestDistance || !nearestTarget) {
							nearestDistance = distance;
							nearestTarget = potentialTargets[i];
						}
					}
					
					if( nearestTarget ) {
						nearestTarget.target();
					} else {
						this.player.miss();
						this.multiplier = 1;
						this.streak = 0;
						this.misses++;
					}
				}
				
				if( this.currentTarget ) {
					var c = this.currentTarget;
					var hit = this.currentTarget.isHitBy( this.toListen[j][1] );
					if( hit ) {
						this.player.shoot( c );
						this.score += this.multiplier;
						
						this.hits++;
						this.streak++;
						if( ZType.MULTIPLIER_TIERS[this.streak] ) {
							this.multiplier += 1;
						}
						
						if( c.dead ) {
							this.kills++;
						}
					}
					else {
						this.player.miss();
						this.multiplier = 1;
						this.streak = 0;
						this.misses++;
					}
				}

				this.tempString = '';
				break;
			}
		}
		
		return false;
	},
	
	
	// -------------------------------------------------------------------------
	// Update/Draw/Gamestate
	
	setGame: function() {
		this.reset();
		this.menu = null;
		this.player = this.spawnEntity( EntityPlayer, ig.system.width/2, ig.system.height - 50 );
		this.mode = ZType.MODE.GAME;
		this.nextWave();
		ig.music.play();
	},
	
	setGameOver: function() {
		this.mode = ZType.MODE.GAME_OVER;
		this.menu = new GameOverMenu();
		this.saveScore(this.score);
	},
	
	
	setTitle: function() {
		this.reset();
		this.mode = ZType.MODE.TITLE;
		this.menu = new TitleMenu();
	},
	
	
	toggleMenu: function() {
		if( this.mode == ZType.MODE.TITLE ) {
			if( this.menu instanceof TitleMenu ) {
				this.menu = new PauseMenu();
			}
			else {
				this.menu = new TitleMenu();
			}
		}
		else {
			if( this.menu ) {
				this.menu = null;
			}
			else{
				this.menu = new PauseMenu();
			}
		}
	},
	
	
	update: function() {
		if(
			ig.input.pressed('menu') &&
			!this.menu
		) {
			this.toggleMenu();
		}
		
		if( this.menu ) {
			//this.yScroll -= 100 * ig.system.tick;
			this.backgroundMaps[0].scroll.y -= 100 * ig.system.tick;
			this.menu.update();
			if( !(this.menu instanceof GameOverMenu) ) {
				return;
			}
		}
		
		// Update all entities and backgroundMaps
		this.parent();
		
		if( this.mode == ZType.MODE.GAME ) {
			this.spawnCurrentWave();
		}
		else if( ig.input.pressed('ok') ) {
			if( this.mode == ZType.MODE.TITLE ) {
				this.setGame();
			}
			else {
				this.setTitle();
			}
		}
		
		this.yScroll -= 100 * ig.system.tick;
		this.backgroundMaps[0].scroll.y += this.yScroll;		
		
		if( this.entities.length > 1 && this.mode == ZType.MODE.GAME ) {
			this.gameTime += ig.system.tick;
		}
		
		// cheat protect
		if( this.score - this.rs > 100 || ig.Timer.timeScale != 1) {
			this.score = 0;
		}
		this.rs = this.score;
	},
	
	
	draw: function() {
		this.backdrop.draw(0,0);		
		
		
		// Background
		var d = this.lastKillTimer.delta();
		ig.system.context.globalAlpha = d < 0 ? d*-2 + 0.5 : 0.5;
		for( var i = 0; i < this.backgroundMaps.length; i++ ) {
			this.backgroundMaps[i].draw();
		}
		ig.system.context.globalAlpha = 1;
		
		// Entities
		for( var i = 0; i < this.entities.length; i++ ) {
			this.entities[i].draw();
		}
		
		// Labels
		for( var i = 0; i < this.entities.length; i++ ) {
			this.entities[i].drawLabel && this.entities[i].drawLabel();
		}
		
		// UI Overlays; different for each mode
		if( this.mode == ZType.MODE.GAME ) {
			this.drawUI();
		}
		else if( this.mode == ZType.MODE.TITLE ) {
			this.drawTitle();
		}
		else if( this.mode == ZType.MODE.GAME_OVER ) {
			this.drawGameOver();
		}
		
		if( this.menu ) {
			this.menu.draw();
		}
	},
	
	drawUI: function() {
		// Score
		var s = '(' + this.multiplier + 'x) ' + this.score.zeroFill(6);
		this.fontScore.draw( s, ig.system.width - 4, ig.system.height - 12, ig.Font.ALIGN.RIGHT );
		
		
		// Wave End Announce
		if( this.waveEndTimer ) {
			var d = -this.waveEndTimer.delta();
			var a = d > 1.7 ? d.map(2,1.7,0,1) : d < 1 ? d.map(1,0,1,0) : 1;
			
			var xs = ig.system.width/2;
			var ys = ig.system.height/3 + (d < 1 ? Math.cos(1-d).map(1,0,0,250) : 0);
			
			var w = this.wave.wave + 1;
			
			ig.system.context.globalAlpha = a;
			this.fontTitle.draw( 'Wave ' + w.zeroFill(3), xs, ys, ig.Font.ALIGN.CENTER );
			ig.system.context.globalAlpha = 1;
		}
	},
	
	drawTitle: function() {
		var xs = ig.system.width/2;
		var ys = ig.system.height/4;
		this.logoImg.draw( xs-250/2, ys-90/4 );
	},
	
	drawGameOver: function() {
		var xs = ig.system.width/2;
		var ys = ig.system.height/4;
		var acc = this.hits ? this.hits / (this.hits + this.misses) * 100 : 0;
		var wpm = this.kills / (this.gameTime / 60);
		
		this.fontTitle.draw( 'Game over', xs, ys, ig.Font.ALIGN.CENTER );
		
		this.fontTitle.draw( this.score.zeroFill(6), xs, ys+90, ig.Font.ALIGN.CENTER );
		this.font.draw( 'Accuracy: ' + acc.round(1) + '%', xs, ys+144, ig.Font.ALIGN.CENTER );
		this.font.draw( 'Words per minute: ' + wpm.round(1), xs, ys+168, ig.Font.ALIGN.CENTER );

		ig.system.context.fillStyle = '#fff';
		ig.system.context.font = 'bold 18px Meiryo';

		var textWidth = this.font.widthForString( 'Killing word: ' );
		var wordWidth = ig.system.context.measureText(this.killWord).width;
		var totalWidth = textWidth + wordWidth;

		this.font.draw( 'Killing word: ', xs-totalWidth/2, ys+192, ig.Font.ALIGN.LEFT );
		
		ig.system.context.fillText( this.killWord, xs-totalWidth/2 + textWidth, ys+207);

		this.font.draw( 'Needed keys: ' + this.neededKeys, xs, ys+216, ig.Font.ALIGN.CENTER );		
	},

	setKillWord: function(killWord)
	{
		if(this.currentTarget)
			this.killWord = this.currentTarget.word;
		else
			this.killWord = killWord;

		// get keys to press
		this.neededKeys = '';
		var isSokuon = false;
		for (var i = 0; i < this.killWord.length; i++) {
			
			var charToFind = this.killWord[i];

			if(charToFind === 'っ')
			{
				isSokuon = true;
				continue;
			};

			if(i < this.killWord.length - 1 && this.isHalfSizeKana(this.killWord[i+1]))
			{
				charToFind += this.killWord[i+1];
			};


			for (var j = 0; j < this.toListen.length; j++) {
				if(this.toListen[j][1] === charToFind)
				{
					if(isSokuon)
					{
						this.neededKeys += this.toListen[j][0][0];	
						isSokuon = false;
					};
					this.neededKeys += this.toListen[j][0];
					break;
				};
			};
		};
	},

	isHalfSizeKana: function(char)
	{
		if(char === 'ゃ' || char === 'ゅ' || char === 'ょ')
			return true;

		if(char === 'ァ' || char === 'ィ' || char === 'ゥ' || char === 'ェ' || char === 'ォ' ||
			char === 'ャ' || char === 'ュ' || char === 'ョ')
			return true;

		return false;
	},

	saveScore: function( score )
	{
		$.ajaxSetup ({
		    cache: false
		});

		var ajaxUrl = "/wp-content/themes/no-jp/arcade/ajax.php";

		$.get(
			ajaxUrl,
			{action: "score-save", game: 'frenzy', score: score}
		);
	}
});

ZType.MODE = {
	TITLE: 0,
	GAME: 1,
	GAME_OVER: 2
};

ZType.MULTIPLIER_TIERS = {
	25: 2,
	50: 3,
	100: 4
};

ZType.WAVES = {
	NORMAL: {
		wave: 0,
		spawn: [],
		spawnWait: 1,
		healthBoost: 0,
		types: [
			{type: EntityEnemyOppressor, count: 0, incEvery: 13},
			{type: EntityEnemyDestroyer, count: 0, incEvery: 5},
			{type: EntityEnemyMine, count: 3, incEvery: 2}
		]
	},
	
	EXPERT: {
		wave: 0,
		spawn: [],
		spawnWait: 0.7,
		healthBoost: 0,
		types: [
			{type: EntityEnemyOppressor, count: 1, incEvery: 7},
			{type: EntityEnemyDestroyer, count: 2, incEvery: 3},
			{type: EntityEnemyMine, count: 9, incEvery: 1}
		]
	}
};

ZType.TOLISTEN = {
	HIRAGANA: [["tsu", "つ"], ["tu", "つ"], ["ka", "か"], ["ca", "か"], ["ca", "か"], ["ki", "き"], ["ku", "く"], ["cu", "く"], ["qu", "く"], ["ke", "け"], ["ko", "こ"], ["co", "こ"], ["kya", "きゃ"], ["kyu", "きゅ"], ["kyo", "きょ"], ["sa", "さ"], ["shi", "し"], ["si", "し"], ["ci", "し"], ["su", "す"], ["se", "せ"], ["ce", "せ"], ["so", "そ"], ["sha", "しゃ"], ["sya", "しゃ"], ["shu", "しゅ"], ["syu", "しゅ"], ["sho", "しょ"], ["syo", "しょ"], ["ta", "た"], ["chi", "ち"], ["ti", "ち"], ["te", "て"], ["to", "と"], ["cha", "ちゃ"], ["tya", "ちゃ"], ["cya", "ちゃ"], ["chu", "ちゅ"], ["tyu", "ちゅ"], ["cyu", "ちゅ"], ["cho", "ちょ"], ["tyo", "ちょ"], ["cyo", "ちょ"], ["na", "な"], ["ni", "に"], ["nu", "ぬ"], ["ne", "ね"], ["no", "の"], ["nya", "にゃ"], ["nyu", "にゅ"], ["nyo", "にょ"], ["ha", "は"], ["hi", "ひ"], ["fu", "ふ"], ["hu", "ふ"], ["he", "へ"], ["ho", "ほ"], ["hya", "ひゃ"], ["hyu", "ひゅ"], ["hyo", "ひょ"], ["ma", "ま"], ["mi", "み"], ["mu", "む"], ["me", "め"], ["mo", "も"], ["mya", "みゃ"], ["myu", "みゅ"], ["myo", "みょ"], ["ra", "ら"], ["ri", "り"], ["ru", "る"], ["re", "れ"], ["ro", "ろ"], ["rya", "りゃ"], ["ryu", "りゅ"], ["ryo", "りょ"], ["wa", "わ"], ["wo", "を"], ["nn", "ん"], ["xn", "ん"], ["n'", "ん"], ["ga", "が"], ["gi", "ぎ"], ["gu", "ぐ"], ["ge", "げ"], ["go", "ご"], ["gya", "ぎゃ"], ["gyu", "ぎゅ"], ["gyo", "ぎょ"], ["za", "ざ"], ["ji", "じ"], ["zi", "じ"], ["zu", "ず"], ["ze", "ぜ"], ["zo", "ぞ"], ["zya", "じゃ"], ["ja", "じゃ"], ["jya", "じゃ"], ["zyu", "じゅ"], ["ju", "じゅ"], ["jyu", "じゅ"], ["zyo", "じょ"], ["jo", "じょ"], ["jyo", "じょ"], ["da", "だ"], ["di", "ぢ"], ["du", "づ"], ["de", "で"], ["do", "ど"], ["dya", "ぢゃ"], ["dyu", "ぢゅ"], ["dyo", "ぢょ"], ["ba", "ば"], ["bi", "び"], ["bu", "ぶ"], ["be", "べ"], ["bo", "ぼ"], ["bya", "びゃ"], ["byu", "びゅ"], ["byo", "びょ"], ["pa", "ぱ"], ["pi", "ぴ"], ["pu", "ぷ"], ["pe", "ぺ"], ["po", "ぽ"], ["pya", "ぴゃ"], ["pyu", "ぴゅ"], ["pyo", "ぴょ"], ["ya", "や"], ["yu", "ゆ"], ["yo", "よ"], ["a", "あ"], ["i", "い"], ["yi", "い"], ["u", "う"], ["wu", "う"], ["whu", "う"], ["e", "え"], ["o", "お"]],
	
	KATAKANA: [["tsu", "ツ"], ["tu", "ツ"], ["ka", "カ"], ["ca", "カ"], ["ca", "カ"], ["ki", "キ"], ["ku", "ク"], ["cu", "ク"], ["qu", "ク"], ["ke", "ケ"], ["ko", "コ"], ["co", "コ"], ["kya", "キャ"], ["kyu", "キュ"], ["kyo", "キョ"], ["sa", "サ"], ["shi", "シ"], ["si", "シ"], ["ci", "シ"], ["su", "ス"], ["se", "セ"], ["ce", "セ"], ["so", "ソ"], ["sha", "シャ"], ["sya", "シャ"], ["shu", "シュ"], ["syu", "シュ"], ["sho", "ショ"], ["syo", "ショ"], ["ta", "タ"], ["chi", "チ"], ["ti", "チ"], ["te", "テ"], ["to", "ト"], ["cha", "チャ"], ["tya", "チャ"], ["cya", "チャ"], ["chu", "チュ"], ["tyu", "チュ"], ["cyu", "チュ"], ["cho", "チョ"], ["tyo", "チョ"], ["cyo", "チョ"], ["na", "ナ"], ["ni", "ニ"], ["nu", "ヌ"], ["ne", "ネ"], ["no", "ノ"], ["nya", "ニャ"], ["nyu", "ニュ"], ["nyo", "ニョ"], ["ha", "ハ"], ["hi", "ヒ"], ["fu", "フ"], ["hu", "フ"], ["he", "ヘ"], ["ho", "ホ"], ["fa", "ファ"], ["fe", "フェ"], ["hya", "ヒャ"], ["hyu", "ヒュ"], ["hyo", "ヒョ"], ["ma", "マ"], ["mi", "ミ"], ["mu", "ム"], ["me", "メ"], ["mo", "モ"], ["mya", "ミャ"], ["myu", "ミュ"], ["myo", "ミョ"], ["ra", "ラ"], ["ri", "リ"], ["ru", "ル"], ["re", "レ"], ["ro", "ロ"], ["rya", "リャ"], ["ryu", "リュ"], ["ryo", "リョ"], ["wa", "ワ"], ["wo", "ヲ"], ["nn", "ン"], ["xn", "ン"], ["n'", "ン"], ["ga", "ガ"], ["gi", "ギ"], ["gu", "グ"], ["ge", "ゲ"], ["go", "ゴ"], ["gya", "ギャ"], ["gyu", "ギュ"], ["gyo", "ギョ"], ["za", "ザ"], ["ji", "ジ"], ["zi", "ジ"], ["zu", "ズ"], ["ze", "ゼ"], ["zo", "ゾ"], ["zya", "ジャ"], ["ja", "ジャ"], ["jya", "ジャ"], ["zyu", "ジュ"], ["ju", "ジュ"], ["jyu", "ジュ"], ["zyo", "ジョ"], ["jo", "ジョ"], ["jyo", "ジョ"], ["da", "ダ"], ["di", "ヂ"], ["du", "ヅ"], ["de", "デ"], ["do", "ド"], ["dya", "ヂャ"], ["dyu", "ヂュ"], ["dyo", "ヂョ"], ["ba", "バ"], ["bi", "ビ"], ["bu", "ブ"], ["be", "ベ"], ["bo", "ボ"], ["bya", "ビャ"], ["byu", "ビュ"], ["byo", "ビョ"], ["pa", "パ"], ["pi", "ピ"], ["pu", "プ"], ["pe", "ペ"], ["po", "ポ"], ["pya", "ピャ"], ["pyu", "ピュ"], ["pyo", "ピョ"], ["va", "ヴァ"], ["vi", "ヴィ"], ["vu", "ヴ"], ["ve", "ヴェ"], ["vo", "ヴォ"], ["fi", "フィ"], ["fe", "フェ"], ["fo", "フォ"], ["ya", "ヤ"], ["yu", "ユ"], ["yo", "ヨ"], ["a", "ア"], ["i", "イ"], ["yi", "イ"], ["u", "ウ"], ["wu", "ウ"], ["whu", "ウ"], ["e", "エ"], ["o", "オ"], ["-", "ー"]]
};

ZType.WORDS = {
	HIRAGANA: {
		2: ['あき','いう','ねこ','えき','そば','いぬ','いえ','きて','うえ','した','のり','かみ','はし','いち','さん','にち','みち','うた','おと','ほん','かお','きた','みぎ','ばか','にく','すし','さけ','ぞう'],
		3: ['くるま','きょう','りょう','でんわ','おまえ','なまえ','きょう','りょう','かぞく','うしろ','おみせ','でんき','てんき','ひだり','みどり','うどん','めがね','きっぷ','きもの','おおい','ながい','うなぎ','きのう','しごと'],
		4: ['いもうと','でんしゃ','むらさき','えんぴつ','ともだち','かきます','がっこう','てんもん','ほうじん','えんぴつ','たっぴつ','どろぬま','いんぼう','せんぱい','おおきい','おおきな','しつれい','あいにく','らいげつ','おじさん','おばさん','おくさん','ひこうき','かんたん','かいしゃ'],
		5: ['ふしんせつ','おとこのこ','きゅうへん','りょうしん','すみません','びしょぬれ','のぞましい','れいぞうこ','ちゅうげん','あかんぼう','ものおぼえ','いいかげん','いそがしい','ももたろう','なつやすみ','さんびゃく','さらいねん','あたらしい','おじいさん','おばあさん','おかあさん','しょうゆう','おもしろい'],
		6: ['はんしゃてき','ひとりむすこ','むらさきいろ','きぬおりもの','あっとうてき','よろこばしい','ことばづかい','がいこくせい','きゅうしゅう','でんしじしょ','のみほうだい','おんなのひと','おとこのひと','だいがくせい','かいしゃいん'],
		7: ['でんわばんごう','とうひょうばこ','しんようきんこ','こうそくどうろ','おくびょうもの','じょうしきてき']
	},
	
	KATAKANA: {
		2: ['バス','キロ','デモ','バカ','タコ','ミリ','リオ','リラ','パリ','コイ','スト','ドル','パン','ビル','プロ'],
		3: ['マクド','ケーキ','タワー','バナナ','ニート','プラハ','サカー','カード','カップ','カフェ','ガラス','クイズ','クラス','グラス','ゲット','ココア','コップ','サイン','ツアー','データ','テスト','テレビ','トイレ','ネオン','バター','パンダ','ビール','ブーム','プール','ページ','ホテル','ポンド','マイク','マッチ','モデル','ラベル','ワイン'],
		4: ['テーブル','リスボン','モスクワ','パソコン','エリート','カーテン','ガソリン','キャンプ','クリーム','コーヒー','コンビニ','サービス','シーズン','ジーンズ','ジュース','スーパー','スクール','ストーブ','セックス','タクシー','チャット','デザート','デパート','ドライブ','トランプ','ニュース','パニック','ハンサム','ハンドル','ビタミン','ファイル','フィルム','マガジン','マスコミ','メーカー','モニター','ライター','ワイパー'],
		5: ['コニャック','ワシントン','アカデミー','アルバイト','アレルギー','アンケート','イヤホーン','ウィスキー','エネルギー','エレガント','オートバイ','オンライン','クリスマス','シャーペン','ジャケット','ストライク','デザイナー','パスポート','ピクニック','ファミリー','フリーター','プレゼント','マンション','ユニホーム'],
		6: ['カンブリック','ニューヨーク','アクセサリー','インスタント','ウェブサイト','コマーシャル','サラリーマン','スーツケース','スキャンダル','チョコレート','ハンドバッグ','ヒットソング'],
		7: ['コンピューター','アイスクリーム','インターネット','エスカレーター','ゲームセンター']
	}
};


ig.main( '#canvas', ZType, 60, 980, 640, 1, ig.ImpactSplashLoader );	

});