/*
* "Uno" chat plugin for Pokemon Showdown
* By syLph, based on hangman by bumbadadabum and Zarel
*/

'use strict';

const permission = 'announce';

class Uno extends Rooms.RoomGame {
	constructor(room, numberusers, users, target) {
		super(room);

		if (room.gameNumber) {
			room.gameNumber++;
		} else {
			room.gameNumber = 1;
		}

		this.gameid = 'uno';
		this.title = 'Uno';

		this.playernames = target.split(',');
		this.allplayers = users;
		this.allplayersdecksizes = new Array();
		for (var i = 0 ; i < this.playernum ; i++) {
			this.allplayersdecksizes[i] = 7;
		}
		this.playernum = numberusers;
		
		this.deck = ["blue|1", "blue|2", "blue|3", "blue|4", "blue|5", "blue|6", "blue|7", "blue|8", "blue|9", "blue|2x", "blue|Invert", "blue|skip", 
		             "red|1", "red|2", "red|3", "red|4", "red|5", "red|6", "red|7", "red|8", "red|9", "red|2x", "red|Invert", "red|skip",
		             "yellow|1", "yellow|2", "yellow|3", "yellow|4", "yellow|5", "yellow|6", "yellow|7", "yellow|8", "yellow|9", "yellow|2x", "yellow|Invert", "yellow|skip",
		             "green|1", "green|2", "green|3", "green|4", "green|5", "green|6", "green|7", "green|8", "green|9", "green|2x", "green|Invert", "green|skip",
		             "wish|", "wish|", "wish|", "wish|", "wish|4x", "wish|4x", "wish|4x", "wish|4x",];
		this.deck = shufflecards(this.deck);
		this.playersdeck = new Array(numberusers);
		for(var i = 0; i < numberusers; i++)
		{
			this.playersdeck[i] = [this.deck.shift(), this.deck.shift(), this.deck.shift(), this.deck.shift(), this.deck.shift(), this.deck.shift(), this.deck.shift()];
		}
		this.currentcard = this.deck.shift();
		this.playeronmovenumber = 0;
		this.player = users[0];
		this.winner = 0;
		this.wishforcolor = false;
		this.drawcards = 0;
		this.invert = false;
		this.skip = false;
		this.checkrun = false;
	}

	play(card, user) {
		if (this.checkrun || (user === this.player && cardinhand(card, this.playersdeck[this.playeronmovenumber]))){
			let attributes = card.split('|');
			let attributescurrent = this.currentcard.split('|');
			if (attributes[0] === attributescurrent[0] || attributes[0] === "wish" || attributescurrent[0] === "any" || attributes[1] === attributescurrent[1]){
				if(!this.checkrun) {
					if (attributes[1] === "2x"){
						this.drawcards += 2;
					}
					else if(attributes[1] === "Invert"){
						this.invert = !this.invert;
					}
					else if(attributes[1] === "skip"){
						this.skip = true
					}
					else if(attributes[1] === "4x"){
						this.drawcards += 4;
					}
					if (attributes[0] === "wish"){
						this.wishforcolor = true;
					}
					var index = this.playersdeck[this.playeronmovenumber].indexOf(card);
					this.playersdeck[this.playeronmovenumber].splice(index, 1);
					this.allplayersdecksizes[this.playeronmovenumber] -= 1;
					if(this.allplayersdecksizes[this.playeronmovenumber] === 0) {
						this.room.add("Congrats " + this.playernames[this.playeronmovenumer] + " you have won");
						end();
					}
					this.deck.push(this.currentcard);
					this.currentcard = card;
					var before = this.playeronmovenumber;
					if (this.invert){
						this.playeronmovenumber = mod(this.playeronmovenumber + 1, this.playernum);
					}
					else {
						this.playeronmovenumber = mod(this.playeronmovenumber - 1, this.playernum);
					}
					this.player = this.playeronmovenumber;
					checknextplayer(this, this.playeronmovenumber, before);
					
				}
				else {
					return true;
				}
			}
			else {
				user.sendTo(this.room, "you can't play this card ._.");
				user.sendTo(this.room, "you wanted to play " + card + " with the attributes" + attributes[0] + " and " + attributes[1] + "<br>" + "the current card is " + this.currentcard + " with the attributes " + attributescurrent[0] + " and " + attributescurrent[1] + " " + yourcardsare(this, this.playeronmovenumber));
				return false;
			}
		}
		else {
			user.sendTo(this.room, "Nah ._.");
		}
	}

	generateWindow() {
		for(var i = 0 ; i < this.playernum ; i++){
			this.allplayers[i].sendTo(this.room, yourcardsare(this, i))
		}
		return "The current card is: " + this.currentcard + "<br>" +
		this.playernames[this.playeronmovenumber] + " please choose your card";
	}
	
	display(user, broadcast) {
		if (broadcast) {
			this.room.add('|uhtml|uno' + this.room.gameNumber + '|' + this.generateWindow());
		} else {
			user.sendTo(this.room, '|uhtml|uno' + this.room.gameNumber + '|' + this.generateWindow());
		}
	}
	
	display2(user, broadcast) {
		if (broadcast) {
			this.room.add('|uhtml|uno' + this.room.gameNumber + '|' + this.generateWindow());
		} else {
			user.sendTo(this.room, '|uhtmlchange|uno' + this.room.gameNumber + '|' + this.generateWindow());
		}
	}

	end() {
		this.room.add('|uhtmlchange|uno' + this.room.gameNumber + '|<div class="infobox">(The game of Uno was ended.)</div>');
		this.room.add("The game of Uno was ended.");
		delete this.room.game;
	}

	finish() {
		delete this.room.game;
	}
}

exports.commands = {
	uno: {
		create: 'new',
		new: function (target, room, user) {
			let params = target.split(',');
			let playernum = target.match(/,/g).length + 1;
			let users = new Array();
			for(var i = 0 ; i < playernum ; i++){
				users[i] = this.targetUserOrSelf(params[i], true);
			}
			if (!this.can(permission, null, room)) return false;
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			if (room.game) return this.errorReply("There is already a game in progress in this room.");

			room.game = new Uno(room, playernum, users, target);
			room.game.display(user, true);

			return this.privateModCommand("(A game of Uno was started by " + user.name + ".)");
		},
		createhelp: ["/uno create [user1],[user2],... - Makes a new Uno game. Requires: % @ # & ~"],

		play: function (target, room, user) {
			if (!room.game || room.game.gameid !== 'uno') return this.errorReply("There is no game of Uno running in this room.");
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");

			room.game.play(target, user);
			room.game.display(user, true);
		},
		playhelp: ["/uno play [card] - Plays card"],

		stop: 'end',
		end: function (target, room, user) {
			if (!this.can(permission, null, room)) return false;
			if (!this.canTalk()) return this.errorReply("You cannot do this while unable to talk.");
			if (!room.game || room.game.gameid !== 'uno') return this.errorReply("There is no game of uno running in this room.");

			room.game.end();
			return this.privateModCommand("(The game of Uno was ended by " + user.name + ".)");
		},
		endhelp: ["/uno end - Ends the game of Four in a row. Requires: % @ # & ~"],

		display: function (target, room, user) {
			if (!room.game || room.game.title !== 'Uno') return this.errorReply("There is no game of Uno running in this room.");
			if (!this.canBroadcast()) return;
			room.update();

			room.game.display(user, this.broadcasting);
		},

		'': function (target, room, user) {
			return this.parse('/help uno');
		}
	},

	unohelp: ["/uno allows users to play the popular game uno in PS rooms.",
				"Accepts the following commands:",
				"/uno create [user1], [user2],... - Makes a new game. Requires: % @ # & ~",
				"/uno play [card] - Plays specified card. shortcut: /uplay [card]",
				"/uno display - Displays the game.",
				"/uno end - Ends the game of uno. Requires: % @ # & ~"],

	uplay: function (target, room, user) {
		//coming soon
	},
	playhelp: ["/uplay - Shortcut for /uno play.", "/uno play [column] - Plays specified card."]
};

function shufflecards(array) {
	  var m = array.length, t, i;

	  // While there remain elements to shuffle…
	  while (m) {

	    // Pick a remaining element…
	    i = Math.floor(Math.random() * m--);

	    // And swap it with the current element.
	    t = array[m];
	    array[m] = array[i];
	    array[i] = t;
	  }

	  return array;
	}

function yourcardsare(uno, i) {
	var string = "Your cards are";
	uno.playersdeck[i].forEach(function(entry) {
		string += " " + entry;
	});
	return string;
}

function cardinhand(card, hand) {
	var bool = false;
	hand.forEach(function(entry) {
		if(card === entry) {
			bool = true;
		}
	});
	return bool;
}

function checknextplayer(uno, c, b) {
	uno.checkrun = true;
	var bool = false;
	
	if(uno.drawcards > 0) {
		uno.playersdeck[c].forEach(function(entry) {
			let attributes = entry.split('|');
			if(attributes[1] === "2x" || attributes[1] === "4x") {
				bool = true;
			}
		});
		if(!bool){
			uno.room.add(uno.room, uno.playernames[c] + " had to draw" + uno.drawcards + " cards!");
			while(uno.drawcards !== 0){
				uno.playersdeck[c].push(uno.deck.shift());
				uno.drawcards--;
			}
		}
	}
	else if(uno.wishforcolor) {
		uno.room.add(uno.room, uno.allplayers[b] + "Please choose the next color.");
	}
	else if(uno.skip){
		uno.playersdeck[c].forEach(function(entry) {
			let attributes = entry.split('|');
			if(attributes[1] === "skip") {
				bool = true;
			}
		});
	}
	else {
		uno.playersdeck[c].forEach(function(entry) {
			bool = uno.play(entry, uno.player);
		});
		if(!bool){
			uno.room.add(uno.room, uno.playernames[c] + " had to draw a card!");
			uno.playersdeck[c].push(uno.deck.shift());
		}
	}
	
	uno.checkrun = false;
	return bool;
}

function mod(n, m) {
    return ((n % m) + m) % m;
}