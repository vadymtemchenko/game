var c = document.getElementById('c'),
	ctx = c.getContext('2d'),
	th = tw = 80,
	countX = 5,
	countY = 6,
	tiles = [],
	heights = [];
	
for(j = 0 ; j < countY+2; j++){
	heights[j] = [];
	for(i = 0; i < countX+1; i++){
		heights[j][i] = Math.random()*30;
	}
}


for(j = 0 ; j < countY; j++){
	tiles[j] = [];
	for(i = 0; i < countX; i++){
		tiles[j][i] = [];
		tiles[j][i][0] = i+Math.ceil(j/2)+' '+(-i+Math.floor(j/2));
//		tiles[j][i][0] = i+j%2+Math.floor(j/2)+' '+(-i+(j+1)%2+Math.floor((j-1)/2));
		
		if(j%2===0){
			tiles[j][i][1] = heights[j][i]; 
			tiles[j][i][2] = heights[j+1][i+1]; 
			tiles[j][i][3] = heights[j+2][i]; 
			tiles[j][i][4] = heights[j+1][i];
		} else {
			tiles[j][i][1] = heights[j][i+1]; 
			tiles[j][i][2] = heights[j+1][i+1]; 
			tiles[j][i][3] = heights[j+2][i+1]; 
			tiles[j][i][4] = heights[j+1][i];
		}
	}
}


var drawTiles = function(){
	var i,j;
	
	for(j = 0 ; j < countY; j++){
		for(i = 0; i < countX; i++){
//			drawTile(i+(j%2)/2, j/2,  tiles[j][i]);
//			drawTile(i+(j%2)/2, j/2,  (i+' '+(-i+Math.floor((j+1)/2)));
			drawTile(i, j,  tiles[j][i][0]);
			console.log(i + (j % 2) / 2, -i + j / 2, (i+(j%2) +' '+(-i+j)));
//			console.log(i + (j % 2) / 2, -i + j / 2, (i +' '+(-i+j)));
		}
	}
};

var drawTile = function(xx, yy, text){
	var x =  xx+(yy%2)/2,
		y = yy/2;
	
	ctx.beginPath();

	ctx.strokeStyle = 'red';
	ctx.moveTo((x+0.5)*tw, y*th + tiles[yy][xx][1]);
	ctx.lineTo((x+1)*tw, (y+0.5)*th + tiles[yy][xx][2]);
	ctx.lineTo((x+0.5)*tw, (y+1)*th + tiles[yy][xx][3]);
	ctx.lineTo(x*tw, (y+0.5)*th + tiles[yy][xx][4]);

	ctx.closePath();

	ctx.stroke();
	
	ctx.font="10px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="middle"; 
	ctx.fillText(text || (x+';'+y), (x+0.5)*tw, (y+0.5)*th);
};

drawTiles();
