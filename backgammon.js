
var gl;
var colorLoc;
var vertices = [];
var canvasHeight = 0;
var canvasWidth = 0;
var shapes = [];
var turn = 'white';
var selected = 0;

function initWebGL()
{
  var canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) { alert( "WebGL isn't available" ); }

  //  Configure WebGL
  canvasHeight = canvas.height;
  canvasWidth = canvas.width;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(199/255, 164/255, 74/255, 1.0);

  //  Load shaders and initialize attribute buffers
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  gameboard.addBoard();
  gameboard.addPoints();
  gameboard.addBar();

  var t = 2/13;
  var cWhite = vec4(1.0, 1.0, 1.0, 1.0);
  var cRed = vec4(1.0, 0.0, 0.0, 1.0);
  // Bottom Pieces
  for(var i = 0; i < 12; i++) {
    pushPieces(gamestate.points[i].white, cWhite, 'white', -1, i);
    pushPieces(gamestate.points[i].red, cRed, 'red', -1, i);
  }

  // Bar Pieces
  for(var c = 0; c < gamestate.bar.white; c++) {
    var x = 0;
    var y = -1 + point.size/3 + point.size/3*2 * c;
    var p = piece.create(point.size/3, x, y, cWhite, 'white');
    shapes.push(p);
  }
  for(var c = 0; c < gamestate.bar.red; c++) {
    var x = 0;
    var y = 1 - point.size/3 - point.size/3*2 * c;
    var p = piece.create(point.size/3, x, y, cRed, 'red');
    shapes.push(p);
  }

  // Top Pieces
  for(var i = 12; i < 24; i++) {
    for(var c = 0; c < gamestate.points[i].white; c++) {
      var x = -t * (18 - i) + ((i > 17) ? t : 0);
      if(gamestate.points[i].white > 5) {
        var y = 1 - point.size/3 - point.size/3*2 * c;
        var p = piece.create(point.size/3, x, y, cWhite, 'white');
      } else {
        var y = 1 - point.size/2 - point.size * c;
        var p = piece.create(point.size/2, x, y, cWhite, 'white');
      }
      shapes.push(p);
    }
    for(var c = 0; c < gamestate.points[i].red; c++) {
      var x = -t * (18 - i) + ((i > 17) ? t : 0);
      if(gamestate.points[i].red > 5) {
        var y = 1 - point.size/3 - point.size/3*2 * c;
        var p = piece.create(point.size/3, x, y, cRed, 'red');
      } else {
        var y = 1 - point.size/2 - point.size * c;
        var p = piece.create(point.size/2, x, y, cRed, 'red');
      }
      shapes.push(p);
    }
  }

  vertices = [];
  for(var i = 0; i < shapes.length; i++) {
    append(vertices, shapes[i].verts);
  }

  var bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

  // Associate out shader variables with our data buffer
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Associate the color variable with the shader
  colorLoc = gl.getUniformLocation (program, "color");

  render();
};

function pushPieces(count, color, colorDesc, yMult, i) {
  var t = 2/13;
  for(var c = 0; c < count; c++) {
    var x = t * (6 - i) - ((i > 5) ? t : 0);
    if(count > 5) {
      var y = yMult * 1 + point.size/3 + point.size/3*2 * c;
      var p = piece.create(point.size/3, x, y, color, colorDesc);
    } else {
      var y = yMult * 1 + point.size/2 + point.size * c;
      var p = piece.create(point.size/2, x, y, color, colorDesc);
    }
    shapes.push(p);
  }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform4fv(colorLoc, vec4(0.0, 0.0, 0.0, 1.0));
  var offset = 0;
  for(var i = 0; i < shapes.length; i++) {
    gl.uniform4fv(colorLoc, shapes[i].color);
    offset = offset + shapes[i].draw(offset);
  }
}

function canvasClick(x, y) {
  var gx = x / canvasWidth * 2 - 1; // webgl x-coord
  var gy = (y / canvasHeight * 2 - 1) * - 1; // webgl y-coord
  console.log("Click at (" + gx + ", " + gy + ")");
  console.log("Closest point: " + coordToPointNumber(gx, gy));
  movePiece(gx, gy);
}

function movePiece(gx, gy) {
  if(selected == 0) {
    selected = closestPiece(gx, gy);
    if(selected == 0) return;
    if(gamestate.turn == 'white' && whiteIsHome()) {
      gamestate.points[selected-1].white--;
      logGameEvent(gamestate.turn+' bears off from point ' + selected)
      selected = 0;
      shapes = [];
      initWebGL();
      checkForWin();
      return;
    } else if(gamestate.turn == 'red' && redIsHome()) {
      gamestate.points[selected-1].red--;
      selected = 0;
      logGameEvent(gamestate.turn+' bears off from point ' + selected)
      selected = 0;
      shapes = [];
      initWebGL();
      checkForWin();
      return;
    }
  } else {
    var mto = coordToPointNumber(gx, gy);
    if(selected == 25) {
      if(gamestate.turn == 'white') {
        if(gamestate.points[mto-1].red > 1) {
          logGameEvent("Illegal move");
          return;
        } else if(gamestate.points[mto-1].red == 1) {
          logGameEvent("White moves a red piece back to bar");
          gamestate.points[mto-1].red--;
          gamestate.bar.red++;
        }
        gamestate.bar.white--;
        gamestate.points[mto-1].white++;
      } else {
        if(gamestate.points[mto-1].white > 1) {
          logGameEvent("Illegal move");
          return;
        } else if(gamestate.points[mto-1].white == 1) {
          logGameEvent("Red moves a white piece back to bar");
          gamestate.points[mto-1].white--;
          gamestate.bar.white++;
        }
        gamestate.bar.red--;
        gamestate.points[mto-1].red++;
      }
      logGameEvent(gamestate.turn + " moved piece from bar to point " + mto);
      selected = 0;
      shapes = [];
      initWebGL();
      return;
    }
    if(gamestate.points[selected-1].white > 0) {
      if(gamestate.points[mto-1].red > 1) {
        logGameEvent("Illegal move");
        return;
      } else if(gamestate.turn == 'red') {
        logGameEvent("White cannot move pieces during red's turn.");
        selected = 0;
        return;
      } else if(gamestate.bar.white > 0) {
        logGameEvent("Must move pieces off bar first");
        selected = 0;
        return;
      } else if(gamestate.points[mto-1].red == 1) {
        logGameEvent("White moves a red piece back to bar");
        gamestate.points[mto-1].red--;
        gamestate.bar.red++;
      }
      gamestate.points[selected-1].white--;
      gamestate.points[mto-1].white++;
    } else if(gamestate.points[selected-1].red > 0) {
      if(gamestate.points[mto-1].white > 1) {
        logGameEvent("Illegal move");
        return;
      } else if(gamestate.turn == 'white') {
        logGameEvent("Red cannot move pieces during white's turn.");
        selected = 0;
        return;
      } else if(gamestate.bar.red > 0) {
        logGameEvent("Must move pieces off bar first");
        selected = 0;
        return;
      } else if(gamestate.points[mto-1].white == 1) {
        logGameEvent("Red moves a white piece back to bar");
        gamestate.points[mto-1].white--;
        gamestate.bar.white++;
      }
      gamestate.points[selected-1].red--;
      gamestate.points[mto-1].red++;
    }
    selected = 0;
    shapes = [];
    initWebGL();
  }
}

function whiteIsHome() {
  if(gamestate.bar.white > 0) return false;
  var whiteSum = 0;
  for(var i = 6; i < 24; i++) {
    whiteSum += gamestate.points[i].white;
  }
  return whiteSum == 0;
}

function redIsHome() {
  if(gamestate.bar.red > 0) return false;
  var redSum = 0;
  for(var i = 0; i < 18; i++) {
    redSum += gamestate.points[i].red;
  }
  return redSum == 0;
}

function checkForWin() {
  var whiteSum = 0;
  var redSum = 0;
  for(var i = 0; i < 24; i++) {
    whiteSum += gamestate.points[i].white;
    redSum += gamestate.points[i].red;
  }
  whiteSum += gamestate.bar.white;
  redSum += gamestate.bar.red;
  if(whiteSum == 0)
    alert('White player has won the game!');
  if(redSum == 0)
    alert('Red player has won the game!');
}

function coordToPointNumber(gx, gy) {
  var num = 1;
  if(gx < (1/13) && gx > -(1/13)) { // The bar
    return 25;
  }
  if(gy > 0) { // Top Row
    num += 12;
    num += (gx + 1) / (2 / 13);
    if(gx > 0) num -= 1;
  } else { // Bottom Row
    num -= (gx -1) / (2 / 13);
    if(gx < 0) num -= 1;
  }
  return Math.floor(num);
}

function closestPiece(gx, gy) {
  for(var i = 0; i < shapes.length; i++) {
    if(shapes[i].type != 'piece') continue;
    var center = shapes[i].center;
    var d = Math.sqrt(Math.pow(center[0]-gx,2) + Math.pow(center[1]-gy,2));
    if(d > point.size/2) continue;
    var ptnum = coordToPointNumber(gx, gy);
    return ptnum;
  }
  return 0;
}

/*
function closestInputOutput(xg, yg, s) {
  var pt = [];
  var scale = 0.1;
  if(xg > shapes[s].coord[0])
    return [shapes[s].coord[0] + 1 * scale, shapes[s].coord[1]];
  if(shapes[s].type != 'not') {
    if(yg > shapes[s].coord[1])
      return [shapes[s].coord[0] - 1 * scale, shapes[s].coord[1] + .5 * scale];
    return [shapes[s].coord[0] - 1 * scale, shapes[s].coord[1] - .5 * scale];
  }
  return [shapes[s].coord[0] - 1 * scale, shapes[s].coord[1]];
}

function closestShape(xg, yg, skipLine) {
  var index = 0;
  var minDist = 1000;
  for(var i = 0; i < shapes.length; i++) {
    if(skipLine && shapes[i].type == 'line') continue;
    var xDist = shapes[i].coord[0] - xg;
    var yDist = shapes[i].coord[1] - yg;
    var dist = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));
    if(minDist > dist) {
      minDist = dist;
      index = i;
    }
  }
  return index;
}
*/

var gamestate = {
  bar: {
    dubCube: {
      player: null,
      value: 1
    },
    red: 0, // number of pieces on bar
    white: 0, // number of pieces on bar
    turn: null
  },
  points: [ // numbered from white's perspective
    {red: 2, white: 0}, // 1w 24r
    {red: 0, white: 0},
    {red: 0, white: 0},
    {red: 0, white: 0},
    {red: 0, white: 0}, // 5w 20r
    {red: 0, white: 5},
    {red: 0, white: 0},
    {red: 0, white: 3},
    {red: 0, white: 0},
    {red: 0, white: 0}, // 10w 15r
    {red: 0, white: 0},
    {red: 5, white: 0},
    {red: 0, white: 5},
    {red: 0, white: 0},
    {red: 0, white: 0}, // 15w 10r
    {red: 0, white: 0},
    {red: 3, white: 0},
    {red: 0, white: 0},
    {red: 5, white: 0},
    {red: 0, white: 0}, // 20w 5r
    {red: 0, white: 0},
    {red: 0, white: 0},
    {red: 0, white: 0},
    {red: 0, white: 2} // 24w 1r
  ]
}

var gameboard = {
  addPoints: function() {
    //create: function(scale, xTran, yTran, color, flipped) {
    var ptSize = point.size;
    var t = 2/13;
    var s = t / (ptSize * 2);
    var white = vec4(153/255, 106/255, 38/255, 1.0);
    var black = vec4(104/255, 45/255 ,3/255, 1.0);
    // Bottom Points
    for(var i = 0; i <= 12; i++) {
      if(i == 6) continue;
      var color = (i < 6 && i % 2 == 0 || i > 6 && i % 2 != 0) ? black : white;
      var pt = point.create(s, ptSize * s - 1 + t *i, 1 * s - 1, color, false);
      shapes.push(pt);
    }
    // Top Points
    for(var i = 0; i <= 12; i++) {
      if(i == 6) continue;
      var color = (i < 6 && i % 2 == 0 || i > 6 && i % 2 != 0) ? white : black;
      var pt = point.create(s, ptSize * s - 1 + t *i, 1 * s + .1, color, true);
      shapes.push(pt);
    }
  },
  addBar: function() {
    var barColor = vec4(114/255, 48/255, 0, 1.0);
    //create: function(width, height, xTran, yTran, color)
    var ptSize = point.size;
    var t = 0.15384615384615385;
    var s = t / (ptSize * 2);
    var x = point.size * s - 1 + t * 6;
    var bar = rectangle.create(point.size - .04, 2, x, 0, barColor);
    shapes.push(bar);
  },
  addBoard: function() {
    var c = vec4(199/255, 164/255, 74/255, 1.0);
    var b = rectangle.create(2, 2, 0, 0, c);
    shapes.push(b);
  }
}

/*
 * SHAPES
 */
var point = {
  size: .17,
  create: function(scale, xTran, yTran, color, flipped) {
    verts = [];
    yF = 1;
    if(flipped) yF = -1;
      verts.push(vec2(-point.size * scale + xTran, -1 * scale * yF + yTran));
      verts.push(vec2(point.size * scale + xTran, -1 * scale *yF + yTran));
      verts.push(vec2(0 * scale + xTran, 1 * scale * yF + yTran));
    return {
      verts: verts,
      color: color,
      type: 'point',
      draw: function(offset) {
        gl.drawArrays(gl.TRIANGLE_FAN, offset, 3);
        return 3;
      },
      npts: 3
    };
  }
}

var piece = {
  radius: point.size / 2,
  create: function(scale, xTran, yTran, color, player) {
    var ticks = 40;
    var tickSize = Math.PI * 2 / ticks;
    var vert = [];
    var xtoyr = canvasWidth / canvasHeight;
    for(var i = 0; i < ticks; i++) {
      if(xtoyr > 1) {
        var x = (Math.sin(tickSize * i) * scale / xtoyr + xTran);
        var y = (Math.cos(tickSize * i) * scale) + yTran;
      } else {
        var x = (Math.sin(tickSize * i) * scale) + xTran;
        var y = (Math.cos(tickSize * i) * xtoyr * scale) + yTran;
      }
      vert.push(vec2(x,y));
    }
    return {
      verts: vert,
      color: color,
      player: player,
      type: 'piece',
      center: [xTran, yTran],
      draw: function(offset) {
        gl.drawArrays(gl.TRIANGLE_FAN, offset, vert.length);
        return vert.length;
      },
      npts: vert.length
    };
  }
}

var rectangle = {
  create: function(width, height, xTran, yTran, color) {
    var vert = [];
    vert.push(vec2(-(width / 2) + xTran, (height / 2) + yTran)); //tl
    vert.push(vec2(-(width / 2) + xTran, -(height / 2) + yTran)); //bl
    vert.push(vec2((width / 2) + xTran, -(height / 2) + yTran)); //br
    vert.push(vec2((width / 2) + xTran, (height / 2) + yTran)); //tr
    return {
      verts: vert,
      color: color,
      type: 'rect',
      draw: function(offset) {
        gl.drawArrays(gl.TRIANGLE_FAN, offset, vert.length);
        return vert.length;
      },
      npts: vert.length
    }
  }
}

/*
 * UTILITY FUNCTIONS
 */
function append(arr, arr2) {
  for(var i = 0; i < arr2.length; i++) {
    arr.push(arr2[i]);
  }
}
