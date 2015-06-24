var SERVER_PORT = 9000;
var MAP_TYPE = {1:'map', 2:'map_test'};
var MAP_TYPE_CURRENT = 2;

var HEIGHTMAP_TYPE = {1:'heightmap', 2:'heightmap_0'};
var HEIGHTMAP_TYPE_CURRENT = 2;

var moment = require('moment');
var WebSocket = require('ws').Server;


var playersAvailiable = require('./data/players.json');
var objects = require('./data/objects.json');
var entities = require('./data/entities.json');

var wss = new WebSocket({port: SERVER_PORT});

var move = {
    speed: 1, // tiles/sec
    dt: 250 // player position calculation time interval in ms
};

move.ds = move.speed * move.dt; // distance passed by player over one time interval

var globalToIndex = function(p, x, y){
    console.log(p)
    var xx = Math.floor(x) - p.sessionOffset.x + p.chunkOffset.x,
        yy = Math.floor(y) - p.sessionOffset.y + p.chunkOffset.y;

    return [Math.floor((xx - yy) / 2), xx + yy];
};

var indexToGlobal = function(p, i, j){
    return [i + Math.ceil(j / 2) + p.sessionOffset.x - p.chunkOffset.x, Math.floor(j / 2) - i + p.sessionOffset.y - p.chunkOffset.y];
};

var map = {
    tiles: [], // tiles = [y][x]
    hmap: [],
    getChunkPrepared: function(player, dx, dy){
        var idx = globalToIndex(player, player.center.globalX, player.center.globalY),
            rez = {},
            temp,
            flag;

        idx[0] += dx;
        idx[1] += dy + dy % 2;

        if(0 <= idx[0] && idx[0] < player.chunkSize.x && 0 <= idx[1] && idx[1] < player.chunkSize.y){            
            flag = Math.abs(dx) >= player.chunkSize.dx;            
            
            if(Math.abs(dx) >= player.chunkSize.dx){
                rez = this.getChunk(player, dx, 0);
            }
            if(Math.abs(dy) >= player.chunkSize.dy){
                temp = this.getChunk(player, flag?dx:0, dy);
                rez[Object.keys(temp)[0]] = temp[Object.keys(temp)[0]];
            }
            if(dx === 0 && dy === 0){
                rez = this.getChunk(player, 0, 0);
            }
        } else {
            rez.error = 'player outside of new calculated chunk';
        }
        
//        console.log('>>>', JSON.stringify(rez));
//        console.log('>>>', require('util').inspect(rez, {depth:null}));
//        player.center.globalX += dx;
//        player.center.globalY;
        
        return rez;
    },
    getChunk: function(player, dx, dy, flag_dx){
        var i, j, val, hVal, bVal, key, idx,
            chunkSize = player.chunkSize,
            iEnd = dx, jEnd = dy,
            ihEnd = dx, jhEnd = dy,
            x,y,
//            x = player.chunkOffset.x + player.sessionOffset.x,
//            y = player.chunkOffset.y + player.sessionOffset.y,
            rez,
            arr = [],
            bArr = [],  //bend array
            hArr = [];

//        idx = globalToIndex(player, x, y);
//        idx = indexToGlobal(player, idx[0] + (dx < 0 ? chunkSize.x : dx), idx[1] + (dy < 0 ? chunkSize.y : dy));
        idx = indexToGlobal(player, dx < 0 ? chunkSize.x : -dx, dy < 0 ? chunkSize.y : -dy);
        x = idx[0];
        y = idx[1];
        
//        console.log('innnn');

        if(dy === 0){
            if(dx === 0) {
                key = 'main';
                iEnd = chunkSize.x;
                jEnd = chunkSize.y;
                ihEnd = chunkSize.x + 1;
                jhEnd = chunkSize.y + 2;
            }
            else {
                iEnd = Math.abs(dx);
                ihEnd = Math.abs(dx);
                jEnd = chunkSize.y;
                jhEnd = chunkSize.y + 2;
                key = dx > 0 ? 'left': 'right';
            }
        } else {            
            jEnd = Math.abs(dy);
            jhEnd = Math.abs(dy);
            iEnd = chunkSize.x;
            ihEnd = chunkSize.x + 2;
            key = dy > 0 ? 'top': 'bottom';
        }

        for(j = 0; j < jEnd; j++){
            arr.push([]); bArr.push([]);

            for(i = 0; i < iEnd; i++){
                val = -1; bVal = 0;

                if(typeof map.tiles[y + Math.floor(j/2)- i] !== 'undefined'){
                    if(typeof map.tiles[y + Math.floor(j/2)- i][x + i + Math.ceil(j/2)] !== 'undefined') {
                        val = map.tiles[y + Math.floor(j/2)- i][x + i + Math.ceil(j/2)];
                        bVal = map.bends[y + Math.floor(j/2)- i][x + i + Math.ceil(j/2)];
                    }
                }
                arr[arr.length-1].push(val);
                bArr[bArr.length-1].push(bVal);
            }
        }

        for(j = 0; j < jhEnd; j++){
            hArr.push([]);

            for(i = 0; i < ihEnd; i++){
                hVal = 0;

                if(typeof map.hmap[y + Math.ceil(j/2)- i] !== 'undefined'){
                    if(typeof map.hmap[y + Math.ceil(j/2) - i][x + i + Math.floor(j/2)] !== 'undefined')
                        hVal = map.hmap[y + Math.ceil(j/2) - i][x + i + Math.floor(j/2)];
                }

                hArr[hArr.length-1].push(hVal);
            }
        }

        idx = indexToGlobal(player, dx, dy);
        player.chunkOffset.x = idx[0] - player.sessionOffset.x;
        player.chunkOffset.y = idx[1] - player.sessionOffset.y;
        
        rez = {};
        rez[key] = {
            x: player.chunkOffset.x,
            y: player.chunkOffset.y,
            tiles: arr,
            hmap: hArr,
            bends: bArr
//            key: key
        };
        
//        idx = globalToIndex(player, x, y);
//        idx = indexToGlobal(player, idx[0] + dx, idx[1] + dy);

        return rez;
    }
};

map.tiles = require('./data/' + MAP_TYPE[MAP_TYPE_CURRENT] + '.json');
map.hmap = require('./data/' + HEIGHTMAP_TYPE[HEIGHTMAP_TYPE_CURRENT] + '.json');
map.bends = require('./data/bend.json');

var Player = function(ws, x, y, avatar) {
    this.x = x;
    this.y = y;
    this.avatar = avatar;
    this.ws = ws;
    this.move = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        time: 0,
        minus: false,
        handler: null
    };
    this.sessionOffset = {
        x: 0,
        y: 0
    };
    this.chunkOffset = {
        x: 0,
        y: 0
    };    
    this.chunkSize = {
//        x: 70,
//        y: 140,        
        x: 5,
        y: 10,
//        x: 61,
//        y: 120,
        dx: 1,
        dy: 2
//        dx: 5,
//        dy: 10
//        x: 110,
//        y: 200
    };
    this.center = {
        indexX: 0,
        indexY: 0,
        globalX: 0,
        globalY: 0
    };
    this.initsessionOffset();
};

Player.prototype.playerLeft = function(){
    var name = this.ws.player,
        key;

    if(this.move.handler){
        clearTimeout(this.move.handler);
    }

    delete players[name];

    for(key in players){
        wsSend(players[key].ws, {playerLeft: name});
    }

    console.log('sys: player', name, 'left game');
};

Player.prototype.moveCallback = function(flag){
    var me = this,
        time = Date.now(),
        dt = (time - this.move.time) / 1000,
        x1 = this.x + this.move.vx * dt * move.speed,
        y1 = this.y + this.move.vy * dt * move.speed,
        key, playersList;

    this.move.time = time;

    if(this.move.x - x1 > 0 ? !this.move.minus : this.move.minus){
        if(!flag){
            this.move.handler = setTimeout(function(){
                me.moveCallback();
            }, move.dt);
        }
        this.x = x1;
        this.y = y1;
    } else {
        this.x = this.move.x;
        this.y = this.move.y;
    }
//        sendSelf
    wsSend(this.ws, {move: {x: this.x - this.sessionOffset.x, y: this.y - this.sessionOffset.y}});
//        sendOther
    for(key in players){
        if(key !== this.ws.player){
            playersList = {};
            playersList[this.ws.player] = {
                name: this.ws.player,
                x: this.x - players[key].sessionOffset.x,
                y: this.y - players[key].sessionOffset.y
            };
            playersList = {movePlayers: playersList};
            wsSend(players[key].ws, playersList);
        }
    }
};

Player.prototype.initsessionOffset = function(){
    var chunk = this.chunkSize,
        dx, dy, idx;

    dx = Math.floor((chunk.x - 1) / 2);
    dy = Math.floor((chunk.y - 1) / 2);

    this.sessionOffset.x = Math.floor(this.x - dx - Math.ceil(dy / 2));
    this.sessionOffset.y = Math.floor(this.y + dx - Math.floor(dy / 2));
    this.center.globalX = this.x;
    this.center.globalY = this.y;
    idx = globalToIndex(this, this.x, this.y);
    this.center.indexX = idx[0];
    this.center.indexY = idx[1];
};

var getObjects = function(p){
    var el,
        arr = [];

    for(el in objects){
        arr.push({type: objects[el].type, x: objects[el].x - p.sessionOffset.x, y: objects[el].y - p.sessionOffset.y});
    }

    return arr;
};

var getPlayers = function(p){
    var key,
        arr = [];

    for(key in players){
        if(players[key] !== p){
            arr.push({name: key, avatar: players[key].avatar, x: players[key].x - p.sessionOffset.x, y: players[key].y - p.sessionOffset.y});
        }
    }

    return arr;
};

var players = {};

var wsSend = function(ws, data){
    if('error' in data){
        console.log('err: player:', ws.player, 'msg:', data.error);
    }
    try {
        ws.send(JSON.stringify(data));
    }
    catch (e) {
        console.log('err: socket sent error',e);
    }
};

console.log('sys: server started at port', SERVER_PORT);
console.log('sys: map', map.tiles.length, 'x', map.tiles[0].length, 'loaded');

wss.on('connection', function(ws){
    ws.on('message',function(message){
        var msg = JSON.parse(message),
            player = players[ws.player],
            move, avatar;

        if('login' in msg) onDataLogin(ws, msg.login);
        if('entities' in msg) onDataEntities(ws, msg.entities);
        if('move' in msg) onDataMove(ws, msg.move);
        if('loadChunk' in msg) onDataLoadChunk(ws, msg.loadChunk);
    });

    ws.on('close', function(){
        if(ws.player in players){
            players[ws.player].playerLeft();
        } else {
            console.log('err: player undefined on playerLeft');
        }
    });
});

var onDataLogin = function(ws, login){
    var player,
        playersList = {},
        key;

    if(login.name in playersAvailiable){
        // check if player connected
        if(login.name in players){
            console.log('sys:','player',login.name,'already connected');
            wsSend(ws, {errors: ['login: player ' + login.name + ' already connected']});
            return;
        }

        // prepare connected players list
        for(key in players){
            playersList[key] = {x: players[key].x, y: players[key].y, avatar: players[key].avatar};
        }

        // create new player for current socket
        ws.player = login.name;
        player = playersAvailiable[login.name];
        players[login.name] = player = new Player(ws, player.x, player.y, 'player01');


        // send data to current player
        console.log('sys:', moment().format("YYYY-MM-DD HH:mm:ss"), login.name, 'joined from', ws.upgradeReq.connection.remoteAddress);
        wsSend(ws, {
            login: true,
            init: {
                x: player.x - player.sessionOffset.x,
                y: player.y - player.sessionOffset.y,
                avatar: player.avatar,
                chunkDx: player.chunkSize.dx,
                chunkDy: player.chunkSize.dy
            }
        });

        wsSend(ws, {map: map.getChunkPrepared(player, 0, 0)});
        wsSend(ws, {objects: getObjects(player)});
        wsSend(ws, {players: getPlayers(player)});

        // send data to other players
        for(key in players){
            if(key !== login.name){
                playersList = {players: [{
                    name: login.name,
                    x: player.x - players[key].sessionOffset.x,
                    y: player.y - players[key].sessionOffset.y,
                    avatar: player.avatar
                }]};
                wsSend(players[key].ws, playersList);
            }
        }

    } else {
        wsSend(ws, {errors: ['login']});
    }
};

var onDataMove = function(ws, data){
    var p = players[ws.player],
        len;

    if(p.move.handler){
        clearTimeout(p.move.handler);
        p.move.handler = null;
        p.moveCallback(true);
    }

    p.move.time = Date.now();

    p.move.x = data.x + p.sessionOffset.x;
    p.move.y = data.y + p.sessionOffset.y;

    p.move.vx = p.move.x - p.x;
    p.move.vy = p.move.y - p.y;

    len = Math.sqrt(Math.pow(p.move.vx, 2) + Math.pow(p.move.vy, 2));

    p.move.minus = p.move.vx !== 0 ? p.move.vx < 0 : p.move.vy < 0;

    p.move.vx /= len;
    p.move.vy /= len;

    p.move.handler = setTimeout(function(){
        p.moveCallback();
    }, move.dt);
};

var onDataEntities = function(ws, data){
    var type,
        rez = {};

    for(type in data){
        rez[data[type]] = entities[data[type]];
    }

    wsSend(ws, {entities: rez});
//    console.log('sys: entities sent', rez);
};

var onDataLoadChunk = function(ws, data){
    wsSend(ws, {loadChunk: map.getChunkPrepared(players[ws.player], data.dx, data.dy)});
};