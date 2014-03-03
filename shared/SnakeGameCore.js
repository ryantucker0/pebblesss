
var SEGMENT_SIZE = 20;
var BOARD_W = 1000;
var BOARD_H = 800;

var BLOCKS_X = BOARD_W / SEGMENT_SIZE;
var BLOCKS_Y = BOARD_H / SEGMENT_SIZE;

scores = [];

var Segment = function (x, y, type, snakeID){
	
	// pixels...
	this.x = x;
	this.y = y;
	
	// segment's number TODO: use it
	this.nx = x / SEGMENT_SIZE;
	this.ny = y / SEGMENT_SIZE;
	
	this.type = type || Segment.SEGMENT_TYPES.BLANK;
	this.color = undefined;
	this.snakeID = snakeID;
};

Segment.SEGMENT_TYPES = {
	BLANK: {
		id: 1,
		color: "#FFF",
	},
	
	RED_BLOCK: {
		id: 2,
		color: "#F23",
	},
	
	SNAKE: {
		id: 3,
		color: "#AA2344",
	},
	
	DEAD_SNAKE: {
		id: 4,
		color: "#A8969D",
	},
};

Segment.prototype.getColor = function(){
	return this.color || this.type.color;
};

Segment.getTypeByValue = function(v){

	var key = null;
	
	Object.keys(Segment.SEGMENT_TYPES).filter(function(k){
		if(!key && Segment.SEGMENT_TYPES[k].id === v){
			key = k;
		}
	});
	
	return Segment.SEGMENT_TYPES[key];
};

var SnakeMessage = function(_type, _msg){
	this.type = _type;
	this.msg = _msg;
};

SnakeMessage.TYPES = {
	// message contains current board
	INIT: {
		id: 1,
	},
	
	// message contains new move of snake
	MOVE: {
		id: 2,
	},
	
	// message sends on new clients connection
	NEW_SNAKE: {
		id: 3,
	},
	
	// message sends when client disconnect
	REMOVE_SNAKE: {
		id: 4,
	},
	
	NEW_BLOCK: {
		id: 5,
	},

	// message to update scores on the client
	SCORE: {
		id: 6,
	}
};

function colorGen(){
	this.h = Math.random();
	this.s = 1.0;
	this.v = .75;

}


var Snake = function(body){ //TODO snake could be instantined as a body array
	
	this.body = body;
	this.snakeID = body[0].snakeID;
	console.log("~~~~~~~~~~~~~~SNAKE ID: " + this.snakeID);
	//this.color = "#5CA315";
	this.score = 0;
	
	this.initHSV = new colorGen();
	this.initColor = hsvToHex(this.initHSV.h,this.initHSV.s,this.initHSV.v);
	console.log(JSON.stringify(this.initHSV));
	console.log(this.initColor);
 	this.colorset = [];
	this.colorset[0] = this.initColor;
	console.log("Init color: " + this.initColor);
	for(var loop = 1; loop < 6; loop++) {
		this.colorset[loop] = hsvToHex(this.initHSV.h,(10-loop)/10.0,this.initHSV.v);
	}
	this.color = this.initColor;
	this.SNAKE_STATES = {
		LIVE: 1,
		DEAD: 2,
	};
	
	this.status = this.SNAKE_STATES.LIVE;
};

Snake.prototype.getTail = function(){
	return this.body[this.body.length - 1];
};

Snake.prototype.getHead = function(){
	console.log("$$$$$$$$$$$ SNAKE ID: " + this.snakeID);
	return this.body[0];
};

Snake.prototype.getSnakeID = function() {
	return this.snakeID;
};

Snake.prototype.isAlive = function(){
	return this.status === this.SNAKE_STATES.LIVE;
}

Snake.prototype.move = function(move){
	console.log("$$$$$$$$$$$ SNAKE ID: " + this.snakeID);
	var current_head = this.getHead();
	var new_head_segment = new Segment(current_head.x + move[0], current_head.y + move[1], Segment.SEGMENT_TYPES.SNAKE, this.snakeID);
	console.log(this.initColor);
	new_head_segment.color = this.initColor;
	//new_head_segment.color = "#0000ff";
	return SnakeGameBoard.moveSnake(this, new_head_segment);
};

Snake.prototype.die = function(){
	this.status = this.SNAKE_STATES.DEAD;
};

var SnakeGameBoard = {

	to_update: [],
	
	board: (function(){
		var board = [];
		for(var y = 0; y < BLOCKS_Y; y++){
	
			board[y] = [];
			
			for(var x = 0; x < BLOCKS_X; x++){
				board[y].push(new Segment(x * SEGMENT_SIZE, y * SEGMENT_SIZE));
			};
		}
		return board;
	})(),
	
	printBoard: function(){
		
		this.board.forEach(function(row){
			var l = "";
			row.forEach(function(segment){
				l += (segment.type.id !== 1) ? segment.type.id : '.';
			});
			console.info(l);
		});
		console.info("--------------");
	},
	
	deleteSegment: function(s){
		var to_erase = this.board[s.y / SEGMENT_SIZE][s.x / SEGMENT_SIZE];
		to_erase.type = Segment.SEGMENT_TYPES.BLANK;
		to_erase.color = Segment.SEGMENT_TYPES.BLANK.color;
		
		this.to_update.push(to_erase);
	},
	
	deleteSnake: function(snake){
		snake.body.forEach(function(segment){
			//SnakeGameBoard.deleteSegment(segment);
			segment.type = Segment.SEGMENT_TYPES.BLANK;
		});
	},
	
	putSegment: function(s){
		this.board[s.y / SEGMENT_SIZE][s.x / SEGMENT_SIZE] = s;
		this.to_update.push(s);
	},
	
	getSegmentsToUpdate: function(){
		return this.to_update;
	},
	
	getSegment: function(x, y){
		return this.board[y][x];
	},
	
	isMoveCrossBoard: function(move){
		return ((move.x < 0) || (move.y < 0) || (move.x >= BOARD_W) || (move.y >= BOARD_H));
	},
	
	teleport: function(move){
		if(move.x < 0){
			move.x = BOARD_W + move.x;
		}
		
		if(move.y < 0){
			move.y = BOARD_H + move.y;
		}
		
		if(move.x >= BOARD_W){
			move.x = move.x - BOARD_W;
		}
		
		if(move.y >= BOARD_H){
			move.y = move.y - BOARD_H;
		}
	},
	
	updateBuffer: function(snake){
		//var colors = ["#5CA315", "#69B81A",  "#74CC1D", "#81DE23", "#8BF026", "#92FA2A", "#A2FF45"];
		var colors = snake.colorset;
		for(var i = 0; i < snake.body.length; i++){
			var current_segment = snake.body[i];
			current_segment.color = colors[i] || colors[colors.length - 1];
			
			this.putSegment(current_segment);
		};
	},
	
	moveSnake: function(snake, new_head_segment){
		
		if(this.isMoveCrossBoard(new_head_segment)){
			this.teleport(new_head_segment);
		}
		
		var move_result = SnakeGameBoard.snakeGameCollisionDetector.processMove(new_head_segment);
		
		if(move_result === SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.SNAKE){
			SnakeGameBoard.deleteSnake(snake);
			return false;
		}
		
		// cut off snake's tail or eat new segment
		if(move_result !== SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.EATABLE_BLOCK){
			SnakeGameBoard.deleteSegment(snake.body.pop());
		}

		var new_body = [new_head_segment];
		[].push.apply(new_body, snake.body);
		snake.body = new_body;
		
		this.updateBuffer(snake);
		
		//this.printBoard();
		return true;
	},
	
	snakeGameCollisionDetector: {
		
		COLLISION_STATES: {
			SNAKE: 1,
			EATABLE_BLOCK: 2,
		},
		
		processMove: function(head){

			var block = SnakeGameBoard.getSegment(head.x / SEGMENT_SIZE, head.y / SEGMENT_SIZE);
			
			switch (block.type.id) {
				case Segment.SEGMENT_TYPES.RED_BLOCK.id:
					//console.log("@@@@@@@@@@@@@@@@@ SNAKE ID: " + head.snakeID);
					//SnakeGameServer.clients[head.snakeID].score++;
					if(scores[head.snakeID] == NaN || scores[head.snakeID] == undefined || scores[head.snakeID] == null)
					{
						scores[head.snakeID] = {score: 0, color: head.color};
					}
					scores[head.snakeID].score++;
					// TODO update the score for the local snake
					console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! NEW SCORE FOR " + head.snakeID + " IS " + scores[head.snakeID]);
					//$("table#scores").html($("table#scores").html() + "<tr><td><div class=\"colorBox\"></div></td><td>" + scores[head.snakeID] + "</td>")
					//document.getElementById("scores").appendChild("<tr><td><div class=\"colorBox\"></div></td><td>" + scores[head.snakeID] + "</td>";
					return SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.EATABLE_BLOCK;
					break;
					
				case Segment.SEGMENT_TYPES.SNAKE.id:
					//console.log("~~~~~~~~~~~~~~~"+head.snakeID);
					return SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.SNAKE;
					break;
		
				case Segment.SEGMENT_TYPES.BLANK.id:
					return false;
					break;
				default:
					break;
			}
		},
	},
	
};

if(typeof exports !== "undefined"){
	exports.SEGMENT_SIZE = SEGMENT_SIZE;
	exports.BOARD_W = BOARD_W;
	exports.BOARD_H = BOARD_H;

	exports.BLOCKS_X = BLOCKS_X;
	exports.BLOCKS_Y = BLOCKS_Y;
	
	exports.Snake = Snake;
	exports.Segment = Segment;
	exports.SnakeMessage = SnakeMessage;
	exports.SnakeGameBoard = SnakeGameBoard;
	exports.scores = scores;
}

function randomHexCode() {
	var a = new Array();
        for(var i = 0; i < 6; i++)
        {
                a[i] = Math.round(Math.random()*16);
                if(a[i]>9)
                {
                        switch(a[i])
                        {
                                case 10:
                                        a[i]="a";
                                        break;
                                case 11:
                                        a[i]="b";
                                        break;
                                case 12:
                                        a[i]="c";
                                        break;
                                case 13:
                                        a[i]="d";
                                        break;
                                case 14:
                                        a[i]="e";
                                        break;
                                case 15:
                                        a[i]="f";
                                        break;
                        }
                }
        }
        var hex = "";
        for(var i = 0; i<6;i++)
        {
                var n = a[i].toString();
                hex += n;
        }
        hex = "#"+hex;
        return hex;
}
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

function hsvToHex(h, s, v) {
    var rgb = HSVtoRGB(h, s, v);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}
