//-----------------------------------------------------------------------------
//
//                               DECLARATIONS
//
//-----------------------------------------------------------------------------

var TIME_DRAW = 100;

var entities = {};
var objects = [];
var objectsSorted = [];
var needRedraw = false;
var needRedrawTiles = false;

function _() {
    console.log.apply(console, arguments);
}

Math.seededRandom = function(max,min) {
  max = max || 1;
  min = min || 0;

  Math.seed = (Math.seed*9301+49297) % 233280;
  var rnd = Math.seed / 233280.0;

  return min + rnd * (max-min);
};

var plane = function(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
    var A, B, C, D, nx, ny, nz, l;
    nx = (y2 - y1) * (z3 - z1) - (y3 - y1) * (z2 - z1);
    ny = (x3 - x1) * (z2 - z1) - (x2 - x1) * (z3 - z1);
    nz = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    l = Math.sqrt((nx * nx) + (ny * ny) + (nz * nz));

    nx = nx / l;
    ny = ny / l;
    nz = nz / l;

    A = nx;
    B = ny;
    C = nz;
    D = -(nx * x1 + ny * y1 + nz * z1);

    return [A, B, C, D];
};

var planeAll = function() {
    var i,j,lx,ly;
    var x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4;
    var c;

    ly = map.tiles.length;
    lx = map.tiles[0].length;

    for(j = 0; j < ly; j++){
        for(i = 0; i < lx; i++){



            c = indexToLocal(i,j);
//            x1 = i - (j % 2) / 2;
//            y1 = j;

            if(j%2===0){
                z1 = map.hmap[j][i];
                z2 = map.hmap[j+1][i + 1];
                z3 = map.hmap[j+2][i];
                z4 = map.hmap[j+1][i];
            } else {
                z1 = map.hmap[j][i+1];
                z2 = map.hmap[j+1][i+1];
                z3 = map.hmap[j+2][i+1];
                z4 = map.hmap[j+1][i];
            }

            x1 = c[0];
            y1 = c[1];

            x2 = x1 + 1;
            y2 = y1;

            x3 = x1 + 1;
            y3 = y1 + 1;

            x4 = x1;
            y4 = y1 + 1;

            map.bends[j][i] = [map.bends[j][i]]
                .concat(plane(x1, y1, z1, x2, y2, z2, x4, y4, z4))
                .concat(plane(x2, y2, z2, x3, y3, z3, x4, y4, z4));
        }
    }
};

var calcZ = function(x, y) {

    var idx = localToIndex(x, y),
        i = idx[0],
        j = idx[1],
        a,b,c,
        bend;

        if((typeof map.bends[j] === 'undefined') || (typeof map.bends[j][i] === 'undefined')){
            debugger
        }

    bend = map.bends[j][i];

    a = i > 0 ? i % 1 : 1 - Math.abs(i % 1);
    b = j > 0 ? j % 1 : 1 - Math.abs(j % 1);

    if(bend[0] === 0){
        c = a + b < 1 ? 0 : 1;
    } else {
        c = a < b ? 0 : 1;
    }
    c = c * 4;

    return (-bend[c + 4] - bend[c + 1] * x - bend[c + 2] * y) / bend[c + 3];
};

var checkObject = function(obj){
    var c = localToIndex(obj.x, obj.y);
    return 0 <= c[0] && c[0] < map.tiles[0].length && 0 <= c[1] && c[1] < map.tiles.length;
};

var localToIndex = function(x,y){
    var xx = Math.floor(x) + map.chunkOffsetX,
        yy = Math.floor(y) + map.chunkOffsetY;

    return [Math.floor((xx - yy) / 2), xx + yy];
};

var indexToLocal = function(i,j){
    return [i + Math.ceil(j / 2) - map.chunkOffsetX, Math.floor(j / 2) - i - map.chunkOffsetY];
};

var localToScreen = function(x, y){
    var xs, ys;
    
    xs = view.w / 2 - x * view.wt / 2 + y * view.wt / 2;
    ys = view.h / 2 - x * view.ht / 2 - y * view.ht / 2 + calcZ(x, y) * view.hKoef;
    return [xs, ys];
};

var screenToLocal = function(x,y){
    var xx, yy, x1, x2, x3, x4, y1, y2, y3, y4,
        xv, n, d, i, xIndex, index, local,
        rezError = false, 
        findTile = [
            [ 0, 0],
            [-1, 0],
            [-1,-1],
            [ 0,-1],
            [ 0, 0],
            [-1, 0],
            [ 0,-1],
            [-1,-1]
        ];

    xx = (x - map.points[0][0][0]) / view.wt;

    if(xx < -0.5 || xx > map.tiles[0].length){
        return rezError;
    }

    xIndex = Math.floor(xx + 0.5);

    xv = (xx +0.5) % 1;
    d = xv < 0.5 ? 0 : 1;

    for(i = map.points.length-1; i--;){
        if(map.points[i][xIndex + (i % 2) * d][1] < y){
            break;
        }
    }

    if(i === -1 || i === map.points.length){
        return rezError;
    }

    x1 = map.points[i][xIndex + (i % 2) * d][0];
    y1 = map.points[i][xIndex + (i % 2) * d][1];
    x2 = map.points[i+1][xIndex + ((i+1) % 2) * d][0];
    y2 = map.points[i+1][xIndex + ((i+1) % 2) * d][1];

    n = (x-x1)*(y2-y1) - (y-y1)*(x2-x1) > 0 ? true : false;
    if(x1 > x2){
        n = !n;
    }

    index = (d << 2) | (n ? 2 : 0) | (i % 2);
    
    xx = xIndex + (i % 2) * d + findTile[index][0];
    yy = i + findTile[index][1];
    
    if(xx < 0 || yy < 0 || xx >= map.tiles[0].length || yy >= map.tiles.length){
        return rezError;
    }
    
    local = indexToLocal(xx, yy);
    
    x1 = map.points[map.links[yy][xx][1]][map.links[yy][xx][0]][0];
    y1 = map.points[map.links[yy][xx][1]][map.links[yy][xx][0]][1];
    x2 = map.points[map.links[yy][xx][3]][map.links[yy][xx][2]][0];
    y2 = map.points[map.links[yy][xx][3]][map.links[yy][xx][2]][1];
    x3 = map.points[map.links[yy][xx][5]][map.links[yy][xx][4]][0];
    y3 = map.points[map.links[yy][xx][5]][map.links[yy][xx][4]][1];
    x4 = map.points[map.links[yy][xx][7]][map.links[yy][xx][6]][0];
    y4 = map.points[map.links[yy][xx][7]][map.links[yy][xx][6]][1];

    if((x-x4)*(y2-y4) - (y-y4)*(x2-x4) > 0){ // true->top
        local[0] = local[0] + getRatio(x1, y1, x2, y2, x4, y4, x, y);
        local[1] = local[1] + getRatio(x1, y1, x4, y4, x2, y2, x, y);
    } else {
        local[0] = local[0] + 1 - getRatio(x3, y3, x4, y4, x2, y2, x, y);
        local[1] = local[1] + 1 - getRatio(x3, y3, x2, y2, x4, y4, x, y);
    }
    
    return local;
};

/*
 * return ratio of segment (x1,y1)-(x2,y2)
 * 
 * @param {type} x1 
 * @param {type} y1
 * @param {type} x2
 * @param {type} y2
 * @param {type} x3
 * @param {type} y3
 * @param {type} xp
 * @param {type} yp
 * @returns {float(0..1)} ratio
 */

var getRatio = function(x1, y1, x2, y2, x3, y3, xp, yp){
    var x, y,
        k = (y3 - y1) / (x3 - x1),
        b = yp - k * xp;

    x = ((yp - k * xp - y1) * (x2 - x1) + x1 * (y2 - y1)) / (y2 - y1 - k * (x2 - x1));
    y = k * x + b;
    
    return Math.sqrt(Math.pow((x1-x),2) + Math.pow((y1-y),2)) / Math.sqrt(Math.pow((x1-x2),2) + Math.pow((y1-y2),2));
};

var sortObjects = function(){
    var key;
    
    for(key in objects){
        if(!objects[key].ok){
            if(objects[key].entity.loaded){
                recalcObjectXY(objects[key]);
                
                objects[key].zOrder = objects[key].y + objects[key].entity.sy;
                objects[key].ok = true;
            }
        }
        
//        if(objects[key].entity.loaded && !('zOrder' in objects[key])){
//            objects[key].zOrder = objects[key].x + objects[key].y - (objects[key].entity.sy || 32) + objects[key].entity.h;
//        }
    }
    objectsSorted.sort(function(a,b){
        return a.zOrder - b.zOrder;
//        return a.x + a.y - b.x - b.y;
    });
};

var loadImage = function (entity){
    if (entity.imgUrl) {
        var img = new Image();
        img.src = entity.imgUrl;
        img.onload = function(){
            entity.img = img;
            entity.loaded = true;
            needRedraw = true;
        };
    }

    if (entity.jsUrl) {
        entity.loaded = true;
        needRedraw = true;

        entity.setWHS = function() {
            this.w = 64;
            this.h = 128;
            this.sx = 32;
            this.sy = 128;
        };
        entity.setWHS();
        entity.draw = function(ctx, obj) {
            if (obj.seed) Math.seed = obj.seed;
            var _w = this.w*(obj.age/100),
                _h = this.h*(obj.age/100),
                _sx = entity.sx*(obj.age/100),
                _sy = entity.sy*(obj.age/100);



            var i, u;
            var x = (obj.x - obj.y) * view.wt / 2 + view.sx - _sx,
                y = (obj.x + obj.y + 1) * view.ht / 2 + view.sy - _sy;

            ctx.fillStyle = '#6d5140';
            ctx.strokeStyle = '#6d5140';
            ctx.fillRect(x + _w/2 - _w/20, y + _h/2, _w/10, _h*0.5);

            u=0;
            ctx.beginPath();
            ctx.moveTo(x + _w/2 + Math.sin(u)*_w, y + _h/2 + Math.cos(u)*_h/4);
            u=Math.PI/2;
            ctx.quadraticCurveTo(x + _w/2 + Math.sin(u-Math.PI/4)*(Math.seededRandom(_w, 0)), y + _h/2 + Math.cos(u-Math.PI/4)*(Math.seededRandom(_w, 0)), x + _w/2 + Math.sin(u)*_w/2, y + _h/2 + Math.cos(u)*_w/2);
            u=Math.PI;
            ctx.quadraticCurveTo(x + _w/2 + Math.sin(u-Math.PI/4)*(Math.seededRandom(_w, 0)), y + _h/2 + Math.cos(u-Math.PI/4)*(Math.seededRandom(_h, 0)), x + _w/2 + Math.sin(u)*_w/2, y + _h/2 + Math.cos(u)*_h/2);
            u=3*Math.PI/2;
            ctx.quadraticCurveTo(x + _w/2 + Math.sin(u-Math.PI/4)*(Math.seededRandom(_w, 0)), y + _h/2 + Math.cos(u-Math.PI/4)*(Math.seededRandom(_h, 0)), x + _w/2 + Math.sin(u)*_w/2, y + _h/2 + Math.cos(u)*_w/2);
            u=2*Math.PI;
            ctx.quadraticCurveTo(x + _w/2 + Math.sin(u-Math.PI/4)*(Math.seededRandom(_w, 0)), y + _h/2 + Math.cos(u-Math.PI/4)*(Math.seededRandom(_w, 0)), x + _w/2 + Math.sin(u)*_w/2, y + _h/2 + Math.cos(u)*_w/2);

//            for (i = 1; i<4; i++) {
//                u = 2*Math.PI*(i/4);
//                u = Math.seededRandom(2*Math.PI, 0);
//                ctx.moveTo(x + this.w/2, y + this.h/2);
//                ctx.lineTo(x + this.w/2 + Math.sin(u)*this.w/2, y + this.h/2 + Math.cos(u)*this.w/2);
//            }
//            ctx.closePath();
            var grd=ctx.createLinearGradient(x, y, x, y + 3*_h/4);
            grd.addColorStop(0,"lightgreen");
            grd.addColorStop(1,"darkgreen");

            ctx.fillStyle=grd;
            ctx.fill();

//            ctx.strokeStyle = 'black';
//            ctx.strokeRect(x, y, this.w, this.h);

        };
    }
};

var loadResource = function(obj) {
//    if(!checkObject(obj)) _("1");

    var el,
        loaded = false;

    if (!(obj.type in entities)) {
        entities[obj.type] = {
            loaded: false
        };
        srv.send('entities', {type: obj.type});
    } else {
//        loaded = true;
        needRedraw = true;
//        recalcObjectXY(obj);
    }

    el = {
        entity: entities[obj.type],
        xloc: obj.x,
        yloc: obj.y, 
        x: 0,
        y: 0, 
        ok: loaded
    };
    if (obj.seed) el.seed = obj.seed;
    if (obj.age) el.age = obj.age;

    objects.push(el);
    /* TODO: функуия сотрировки и вставка */
    objectsSorted.push(el);
    return el;
};

var recalcObjectXY = function(obj){
    obj.x = (obj.xloc - obj.yloc) * view.wt / 2 + view.sx - obj.entity.sx;
    obj.y = (obj.xloc + obj.yloc) * view.ht / 2 + view.sy - obj.entity.sy - calcZ(obj.xloc, obj.yloc) * view.hKoef;
//    obj.x = x;
//    obj.y = y;
};

var redraw = function (){
    draw();
    setTimeout(redraw, 0);
};

var draw = (function (){
    var lastItem = 0;
//    var timeFPS;
//    var frames = 0;
//    var times = 0;
//    var fps5 = 0;


    return function(){
        var timeStart = Date.now(),
            len = objectsSorted.length;

        //if (map.tiles.length === 0 || map.hmap.length === 0) return;
        if (!needRedraw && lastItem === 0) return;
                _('redraw');

        if(needRedraw && lastItem === 0){
//            timeFPS = Date.now();
            needRedraw = false;

            sortObjects();

            view.ctx.clearRect(0, 0, view.w, view.h);

            if(needRedrawTiles) view.drawTiles();

            // draw crosses
            //
//            view.ctx.strokeStyle = '#000000';
//            view.ctx.beginPath();
//            view.ctx.moveTo(0,0);
//            view.ctx.lineTo(view.w, view.h);
//            view.ctx.moveTo(view.w,0);
//            view.ctx.lineTo(0, view.h);
//            view.ctx.closePath();
//            view.ctx.stroke();

            view.ctx.strokeStyle = '#ff0000';
            view.ctx.beginPath();
            view.ctx.moveTo(view.sx - 10, view.sy);
            view.ctx.lineTo(view.sx + 10, view.sy);
            view.ctx.moveTo(view.sx, view.sy - 10);
            view.ctx.lineTo(view.sx, view.sy + 10);
            view.ctx.closePath();
            view.ctx.stroke();

        }

        timeStart = Date.now();
        for(; lastItem < len; lastItem++   // view.ctx.drawImage(obj.entity.img, obj.x, obj.y, obj.entity.w, obj.entity.h);
){
            if(Date.now() - timeStart > TIME_DRAW){
                return;
            }
//            if(objectsSorted[lastItem].entity.loaded){

//            if(!objectsSorted[lastItem].ok){
//                if(objectsSorted[lastItem].entity.loaded){
//                    recalcObjectXY(objectsSorted[lastItem]);
//                    objectsSorted[lastItem].ok = true;
//                }
//            }
            if(objectsSorted[lastItem].ok){
                if (objectsSorted[lastItem].entity.draw) {
                    objectsSorted[lastItem].entity.draw(view.ctx, objectsSorted[lastItem]);
                } else {
                    view.drawObj(objectsSorted[lastItem]);
                }
            } else {
                needRedraw = true;
            }
        }
        lastItem = 0;

//        // fps counter
//        fps = 1000/(Date.now()-timeFPS);
//        times += Date.now()-timeFPS;
//        frames++;
//        if (times >= 5000) {
//            fps5 = 1000*frames/times;
//            frames = 0;
//            times = 0;
//
//        }
//
//        view.ctx.fillStyle = 'rgba(255,255,255,0.8)';
//        view.ctx.fillRect(0, 0, 70, 28);
//        view.ctx.font = "12px Arial";
//        view.ctx.fillStyle = '#000000';
//        view.ctx.fillText('fps:  ' + Math.round(10*fps)/10, 2, 12);
//        view.ctx.fillText('fps5: ' + Math.round(10*fps5)/10, 2, 24);


        if(!mouse.dragFlag){
            view.ctxView.drawImage(view.canvasTiles, 0, 0);
            view.ctxView.drawImage(view.canvas, 0, 0);
            
        } 
            

        // screen auto move
//        view.sx = view.sx + ddx;
//        if (view.sx > view.w) ddx = -1;
//        if (view.sx < 0) ddx = 1;



    };
})();

//-----------------------------------------------------------------------------
//
//                               VIEW
//
//-----------------------------------------------------------------------------

var view = {
    sx: 0,
    sy: 0,
    wt: 0,
    ht: 0,
    w: 0,
    h: 0,
    zoom: 1
};


//var ddx = 1;
//var img = new Image();

view.init = function (){
    view.canvas = document.createElement('canvas');
    view.ctx = view.canvas.getContext("2d");

    view.w = view.canvas.width = window.innerWidth;
    view.h = view.canvas.height = window.innerHeight;
    view.zoom = 3;
//    view.hKoef = 200;
    view.hKoef = 200;
    view.wt = 64*this.zoom;
    view.ht = 32*this.zoom;
//    view.sx = view.w / 2 - (player.x - player.y + 1) * view.wt / 2;
//    view.sy = view.h / 2 - (player.x + player.y) * view.ht / 2;

    view.canvasTiles = document.createElement('canvas');
    view.ctxTiles = view.canvasTiles.getContext("2d");
    view.canvasTiles.width = view.w;
    view.canvasTiles.height = view.h;

    view.canvasView = document.createElement('canvas');
    view.ctxView = view.canvasView.getContext("2d");
    view.canvasView.width = view.w;
    view.canvasView.height = view.h;

    document.getElementsByTagName('body')[0].appendChild(view.canvasView);

//    ddx = 1;
//    setInterval(function(){
//        needRedraw = true;
//    }, 0);


};

view.drawTiles = function(){
    var i, j, ii, jj, lx, ly;
        needRedrawTiles = false;

    if (map.tiles.length > 0) {
        lx = map.tiles[0].length;
        ly = map.tiles.length;

        view.ctxTiles.fillStyle = '#ffffff';
        view.ctxTiles.fillRect(0, 0, view.w, view.h);

        for(j = 0; j < ly; j++){
            for(i = 0; i < lx; i++){
                view.drawTile(i, j);
            }
	}
    }
};

view.drawTile = function(x, y){
    var c = ((230/10)*map.tiles[y][x]).toString();
    c = 'rgb(' + c + ',' + c + ',' + c + ')';
    c = (map.tiles[y][x] === -1 ? '#e0e0e0' : c);
//    var x = (a - b) * view.wt / 2 + view.sx,
//        y = (a + b) * view.ht / 2 + view.sy,
//        c = (v === -1 ? '#e0e0e0' : '#ebd0a0');

    view.ctxTiles.fillStyle = c;
    view.ctxTiles.strokeStyle = 'rgba(128,64,0,0.9)';
    view.ctxTiles.lineWidth = 1;

    view.ctxTiles.beginPath();
    view.ctxTiles.moveTo(map.points[map.links[y][x][1]][map.links[y][x][0]][0], map.points[map.links[y][x][1]][map.links[y][x][0]][1] - 0.5);
    view.ctxTiles.lineTo(map.points[map.links[y][x][3]][map.links[y][x][2]][0] + 0.5, map.points[map.links[y][x][3]][map.links[y][x][2]][1] + 0.5);
//    view.ctxTiles.lineTo(map.points[map.links[y][x][5]][map.links[y][x][4]][0], map.points[map.links[y][x][5]][map.links[y][x][4]][1]);
    view.ctxTiles.lineTo(map.points[map.links[y][x][7]][map.links[y][x][6]][0] - 0.5, map.points[map.links[y][x][7]][map.links[y][x][6]][1] + 0.5);
    view.ctxTiles.closePath();
    view.ctxTiles.fill();
    view.ctxTiles.stroke();

    view.ctxTiles.beginPath();
//    view.ctxTiles.moveTo(map.points[map.links[y][x][1]][map.links[y][x][0]][0], map.points[map.links[y][x][1]][map.links[y][x][0]][1]);
    view.ctxTiles.moveTo(map.points[map.links[y][x][3]][map.links[y][x][2]][0] + 0.5, map.points[map.links[y][x][3]][map.links[y][x][2]][1] - 0.5);
    view.ctxTiles.lineTo(map.points[map.links[y][x][5]][map.links[y][x][4]][0], map.points[map.links[y][x][5]][map.links[y][x][4]][1] + 0.5);
    view.ctxTiles.lineTo(map.points[map.links[y][x][7]][map.links[y][x][6]][0] - 0.5, map.points[map.links[y][x][7]][map.links[y][x][6]][1] - 0.5);
    view.ctxTiles.closePath();
    view.ctxTiles.fill();
    view.ctxTiles.stroke();
};

view.drawObj = function(obj){
//    var x = (obj.x - obj.y) * view.wt / 2 + view.sx - obj.entity.sx,
//        y = (obj.x + obj.y) * view.ht / 2 + view.sy - obj.entity.sy;
//
//    view.ctx.drawImage(obj.entity.img, x, y, obj.entity.w, obj.entity.h);
//console.log()
   // view.ctx.drawImage(obj.entity.img, obj.x, obj.y, obj.entity.w, obj.entity.h);
};

view.calculateOffset = function(mapx, mapy){
    this.sx = this.w / 2 - (mapx + map.chunkOffsetX) * this.wt / 2 + (mapy + map.chunkOffsetY) * this.wt / 2 ; //mapx * this.wt - (this.w - this.ht) / 2;
    this.sy = this.h / 2 - (mapx + map.chunkOffsetX) * this.ht / 2 - (mapy + map.chunkOffsetY) * this.ht / 2 ; //mapy * this.wt - (this.h - this.ht) / 2;
    console.log(mapx, mapy, 'sx: ', this.sx, 'sy: ', this.sy);
};

view.calculateOffsetZ = function(mapx, mapy){
    this.calculateOffset(mapx, mapy);
    this.sy += calcZ(mapx, mapy) * view.hKoef;
};

//-----------------------------------------------------------------------------
//
//                               MAP
//
//-----------------------------------------------------------------------------

var map = {
    tiles: [],
    links: [],
    points: [],
    hmap: [],
    lx: 0,
    ly: 0,
    chunkOffsetX: 0,
    chunkOffsetY: 0,
    centerLocalX: 0,
    centerLocalY: 0,
    centerIndexX: 0,
    centerIndexY: 0    
//    addTiles: function(_tiles){
//        map.tiles = _tiles.arr;
//    }
};

map.loadChunk = function(dx, dy){
//    var idx = localToIndex(loc[0], loc[1]),
//        dx = map.centerLocalX - idx[0],
//        dy = map.centerLocalY - idx[1];
    
    if(Math.abs(dx) >= player.chunk.dx || Math.abs(dy) >= player.chunk.dy){
        srv.send('loadChunk', {dx: dx, dy: dy});
        return true;
    }
    
    return false;
};

map.recalcPoints = function(){
    var i,j,lx,ly,loc,scr;

    ly = map.tiles.length+2;
    lx = map.tiles[0].length+1;

    for(j = 0; j < ly; j++){
        for(i = 0; i < lx; i++){
//            loc = indexToLocal(i,j);
//            scr = localToScreen(loc[0], loc[1]);
//            map.points[j][i][0] = scr[0];
//            map.points[j][i][1] = scr[1];
            
//            map.points[j][i][0] = (view.w / 2 - x * view.wt / 2 + y * view.wt / 2) * view.zoom;
//            map.points[j][i][1] = (view.h / 2 - x * view.ht / 2 - y * view.ht / 2 + map.hmap[j][i] * view.hKoef) * view.zoom;
            map.points[j][i][0] = view.sx + (i - (j % 2) / 2 ) * view.wt;
            map.points[j][i][1] = view.sy + j * view.ht / 2 - map.hmap[j][i] * view.hKoef;
        }
    }
};

map.processLoadedChunk = function(chunk){
    var i, part, len=0, idx;
    
    if('left' in chunk){
        part = chunk.left;
        len = part.tiles[0].length;
        
        map.chunkOffsetX = part.x;
        map.chunkOffsetY = part.y;
        
        for(i = part.tiles.length; i--;){
            map.tiles[i] = [].concat(part.tiles[i], map.tiles[i].slice(0, -len));
            map.bends[i] = [].concat(part.bends[i], map.bends[i].slice(0, -len));
        }
        
        for(i = part.hmap.length; i--;){
            map.hmap[i] = [].concat(part.hmap[i], map.hmap[i].slice(0, -len));
        }
    }
    if('right' in chunk){
        part = chunk.right;
        len = part.tiles[0].length;
        
        map.chunkOffsetX = part.x;
        map.chunkOffsetY = part.y;
        
        for(i = part.tiles.length; i--;){
            map.tiles[i] = [].concat(map.tiles[i].slice(len), part.tiles[i]);
            map.bends[i] = [].concat(map.bends[i].slice(len), part.bends[i]);
        }
        
        for(i = part.hmap.length; i--;){
            map.hmap[i] = [].concat(map.hmap[i].slice(len), part.hmap[i]);
        }
    }
    if('top' in chunk){
        part = chunk.top;
        len = part.tiles.length;
        
        map.chunkOffsetX = part.x;
        map.chunkOffsetY = part.y;
        
        map.tiles = [].concat(part.tiles, map.tiles.slice(0, -len));
        map.bends = [].concat(part.bends, map.bends.slice(0, -len));
        map.hmap = [].concat(part.hmap, map.hmap.slice(0, -len));
    }
    if('bottom' in chunk){
        part = chunk.bottom;
        len = part.tiles.length;
        
        map.chunkOffsetX = part.x;
        map.chunkOffsetY = part.y;
        
        map.tiles = [].concat(map.tiles.slice(len), part.tiles);
        map.bends = [].concat(map.bends.slice(len), part.bends);
        map.hmap = [].concat(map.hmap.slice(len), part.hmap);
    }
    
    if (len>0) {
        idx = indexToLocal(map.centerIndexX, map.centerIndexY);
        map.centerLocalX = idx[0];
        map.centerLocalY = idx[1];
    }
    
};

//-----------------------------------------------------------------------------
//
//                               PLAYER
//
//-----------------------------------------------------------------------------

var player = {
    x: 0.5,
    y: 0.5,
    name: ''
};
//-----------------------------------------------------------------------------
//
//                               PLAYERS
//
//-----------------------------------------------------------------------------

var players = {};

//-----------------------------------------------------------------------------
//
//                               ONLOAD
//
//-----------------------------------------------------------------------------

window.onload = function(){
    document.getElementById('connect_btn').onclick = function(){
        var name = document.getElementById('playerName').value;
            url = document.getElementById('server').value;

        srv.connect(name, url);
    };
};

//-----------------------------------------------------------------------------
//
//                               MOUSE
//
//-----------------------------------------------------------------------------

var mouse = {
     startX: 0,
     startY: 0,
     button: -1,
     dragFlag: false
};

mouse.mouseDown = function(e){
    if(mouse.button === -1){
        mouse.startX = e.clientX;
        mouse.startY = e.clientY;
        mouse.button = e.button;
    }
    _('local x/y',screenToLocal(e.clientX,e.clientY));
};

mouse.mouseUp = function(e){
    if(mouse.button !== e.button){
        return false;
    }
    
    if (mouse.dragFlag) {
        mouse.dragFlag = false;
        screenMoveEnd(e.clientX, e.clientY);
    } else {
        mouseClick(e.clientX - e.target.offsetLeft, e.clientY - e.target.offsetTop);
    }
    
    mouse.button = -1;
};

mouse.mouseMove = function(e){
    if(mouse.button === -1){
        // 
    } else if (mouse.button === 0){
        // drag map
        if(!mouse.dragFlag){
            if(Math.abs(mouse.startX - e.clientX) > 10 || Math.abs(mouse.startY - e.clientY) > 10)
                mouse.dragFlag = true;
        } 
        if(mouse.dragFlag){
            screenMove(e.clientX, e.clientY);
        }
    }
};

var screenMove = function(x, y){
    var dX = x - mouse.startX,
        dY = y - mouse.startY;

    view.ctxView.clearRect(0, 0, view.w, view.h);
    view.ctxView.drawImage(view.canvasTiles, dX, dY);
    view.ctxView.drawImage(view.canvas, dX, dY);
    
    view.ctxView.strokeStyle = '#000000';
    view.ctxView.beginPath();
    view.ctxView.moveTo(0,0);
    view.ctxView.lineTo(view.w, view.h);
    view.ctxView.moveTo(view.w,0);
    view.ctxView.lineTo(0, view.h);
    view.ctxView.moveTo(view.w/2,0);
    view.ctxView.lineTo(view.w/2, view.h);
    view.ctxView.moveTo(0, view.h/2);
    view.ctxView.lineTo(view.w, view.h/2);

    view.ctxView.closePath();
    view.ctxView.stroke();
};

var screenMoveEnd = function(x, y){
    var dX = x - mouse.startX,
        dY = y - mouse.startY,
        i, j;

//    var xy = screenToLocal(mouse.startX - x, mouse.startY - y);
//    calcZ(xy[0], xy[1]); 
    
    
//    view.sx += dX;
//    view.sy += dY;
//   

//    for(i = objects.length; i--;){
//        if(objects[i].ok){
//            objects[i].x += dX;
//            objects[i].y += dY; 
//        } 
//    }
    
    
//    for(i = map.points.length; i--;){
//        for(j = map.points[0].length; j--;){
//            map.points[i][j][0] += dX; 
//            map.points[i][j][1] += dY; 
//        }
//    }
    
    // proba
    
//    var loc_old = screenToLocal(xC, yC);
//    var idx_old = localToIndex(loc_old[0], loc_old[1]);
//    var loc_old = screenToLocal(map.centerLocalX, map.centerLocalY);
    var idx_old = localToIndex(map.centerLocalX, map.centerLocalY);
    
    var loc = screenToLocal(view.w / 2 - dX, view.h / 2 - dY);
    var idx = localToIndex(loc[0], loc[1]);
    
//    view.sx += dX;
//    view.sy += dY;
    
//    console.log('local:',loc);
    map.loadChunk(idx_old[0] - idx[0], idx_old[1] - idx[1]);
    
    map.newLocalX = loc[0];
    map.newLocalY = loc[1];
    
//    view.calculateOffsetZ(loc[0], loc[1]);
//    map.recalcPoints();
    
//    for(i = objects.length; i--;){
//        objects[i].ok = false;    
//    }
    
    // proba end
    
//    needRedraw = true;
//    needRedrawTiles = true;
};

var mouseClick = function(x, y){
    var xy = screenToLocal(x,y);
    
    if(!xy) return;

    srv.send('move', {x: xy[0], y: xy[1]});
};