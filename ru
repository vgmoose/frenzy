<!--
                                          :@@9             9@B@,      
                                           ,Bs    2@      M@,,r       
                                           :@     G9     X@      ,@i  
                                           @B            @9      B@   
                      @B                   Bs   9B@   sB@@@M@B@MGB@M@B
                     XBB                  s@     @@     B@      9@    
                     @@                   @B    ,B:     @G      @G    
     ,rr         :r:i@B   ,,,      ,     ,Br    B@     rB,     r@,    
   s@@BB@B    iB@B@@@Bs  :@B@:    @B     s@     @5     9@      9@     
  B@s   G@S  MBG    B@     @B    SB9     X,    i2      X       X      
 S@i   i@@  @Bs    :@@    GBs    B@     :9     2s     rS      rX      
:@BHXMB@r  :@@     @B:    B@    ,@B     Gs    :@      Br      Bs      
@B9        9@9     B@    r@G    MBr                                   
M@B        9B@   ,B@2    B@9  ,XB@                                    
 i@B9XBBS   @@@B@;2B@Xs  r@B@BH @@SG
 
-->

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
		<title>Russian typing game | LinguaLift Frenzy</title>
		
		<meta http-equiv="content-type" content="text/html; charset=utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
		<meta name="author" content="Philip Seyfi, divita.eu">
		<meta name="robots" content="index, follow">

		<meta property="fb:admins" content="seifip" />

		<meta property="og:title" content="Master the cyrillic keyboard by playing Frenzy!"/>
	    <meta property="og:type" content="website"/>
	    <meta property="og:url" content="http://edulift.eu/frenzy/ru/"/>
	    <meta property="og:image" content="http://cdn.lingualift.com/wp-content/themes/no-ru/img/logo-ru.png"/>
	    <meta property="og:site_name" content="Russian Frenzy"/>
	    <meta property="og:locale" content="en_GB" />
	    <meta property="og:description" content="LinguaLift Frenzy is a fun little game which will help you master cyrillic and type Russian like a pro."/>

	    <meta name="description" content="LinguaLift Frenzy is a fun little game which will help you master cyrillic and type Russian like a pro."/>
			
		<link rel="shortcut icon" href="http://russian.lingualift.com/wp-content/themes/no-ru/favicon.ico">

		<link rel="stylesheet" href="http://cdn.lingualift.com/wp-content/themes/no/style/main-ru.css?v=3.6">
		<style type="text/css">
			body {
				background:#111;
			}
			#canvas {
				position: absolute;
				margin: auto;
			}
			#arcade-help {
				width: 980px;
				height: 640px;
			}
			#footer {
				text-align: center;
				position: absolute;
				margin:0 10px;
				top: 650px;
				width: 960px;
				color: #666;
			}
			a {
				color:#999;
			}
			.cta{
				display: block;
				width: 980px;
				padding: 10px 15px;
				background: #18191D;
				margin: auto;
				margin-top: 20px;
				color: #62616D;
				text-align: center;
				cursor:pointer;
			}
			.cta:hover{
				background:#272B3F;
				color:#aaa;
				text-decoration:none;
			}
		</style>
</head>

<body>
	<script src="http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.2.min.js"></script>
	<script src="lib/impact/impact.js"></script>
	<script src="lib/game/main.js"></script>
	<script>
	ig.module('ztype').requires('game.main').defines(function(){
		ZType.StartGame();
	});
	var site = parent;
	</script>

	<a class="cta" href="http://russian.lingualift.com/">Ready to take your Russian to the next level? <strong>Click here</strong> and start your journey to fluency at Russian LinguaLift now!</a>

	<div style="width: 980px;margin: 20px auto 0;position:relative;">

		<canvas id="canvas"></canvas>

		<div id="arcade-help" style="display:none;padding-top:100px;">
			<h3>How to play</h3>
			<p>To play Russian Frenzy, type words you see on the screen using a Russian keyboard.</p>
			<h3>Example</h3>			
			<p style="font-size:22px;padding:5px 15px;">ананас <kbd>А</kbd> <kbd>Н</kbd> <kbd>A</kbd> <kbd>Н</kbd> <kbd>A</kbd> <kbd>С</kbd>&nbsp;&nbsp;&nbsp;&nbsp;белизна <kbd>Б</kbd> <kbd>Е</kbd> <kbd>Л</kbd> <kbd>И</kbd> <kbd>З</kbd> <kbd>Н</kbd> <kbd>А</kbd></p>
			<p>Tip: You can also use a <a href="http://winrus.com/kbd_e.htm">phonetic keyboard layout</a> with Russian sounds mapped to the respective English keys.</p>
			<span id="help-close" class="btn large brand" style="margin-top: 20px;">Play the game</span>
		</div>

		<a style="position:absolute;left: 20px;top: 15px;" href="http://edulift.eu/"><img alt="EduLift" src="http://cdn.lingualift.com/wp-content/themes/no/img/edulift-logo.png"></a>

		<script>
			$('#help-close').click(function(){
				toggleTutorial();
			})
			toggleTutorial = function()
			{
				$('#arcade-help').toggle();
			};
		</script>

		<div id="fb-root"></div>
		<script>(function(d, s, id) {
		  var js, fjs = d.getElementsByTagName(s)[0];
		  if (d.getElementById(id)) return;
		  js = d.createElement(s); js.id = id;
		  js.src = "//connect.facebook.net/en_US/all.js#xfbml=1&appId=198405793566943";
		  fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));</script>

		<div id="footer">
			<div style="float:right;"><a href="http://russian.lingualift.com/learning-games/">Find more Russian learning games at LinguaLift</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="/frenzy/jp">Play Japanese Frenzy</a></div>
			<div style="float:left;"><div class="fb-like" data-send="true" data-width="450" data-show-faces="true" data-colorscheme="light" data-font="segoe ui"></div></div>
		</div>

	</div>
</body>
</html>