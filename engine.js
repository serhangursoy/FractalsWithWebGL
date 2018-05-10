const maxNumTriangles = 9500; // This is mathematically required. Simple
const maxNumVertices = 3 * maxNumTriangles; // For every triangle use 3 vert
var index = 0; // Current index global variable
var first = true; // Is this first?
var gl; // Gl object
var canWidth, canHeight; // Store canvasNewHeight as well as width
var startPosX, startPosY, endPosY = 0; // Start position X-Y and End Y
var canvas; // Canvas object
var cBuffer, vBuffer; // Color and Vertex buffers
var iterNumber = 1; // Iter number. This will be changed

const RGB_RATIO = (1 / 256); // This is for color calculation
var canvColor = vec4(1.0, 1.0, 1.0, 1.0), // Starter colors
  fractBackColor = vec4(0.0, 0.0, 0.0, 1.0),
  fractColor = vec4(0.0, 1.0, 0.3, 1.0);
var isFilled = true; // Starting with filled. Can change whenever he/she want


// INIT FUNCTION
window.onload = function init() {
  // Create canvas
  canvas = document.getElementById("gl-canvas");
  // Create elements.
  // Canvas color picker
  canvasPicker = document.querySelector("#canvasColor");
  canvasPicker.value = "#ffffff";
  canvasPicker.addEventListener("change", canvasColorChange, false);
  // Fractal color picker
  fracColor = document.querySelector("#fractalColor");
  fracColor.value = "#00ff4c";
  fracColor.addEventListener("change", fractalColorChange, false);
  // Fractal background color picker
  fracBack = document.querySelector("#fractalBgColor");
  fracBack.value = "#111111";
  fracBack.addEventListener("change", fractalBackgroundColorChange, false);
  // Loader element
  document.getElementById('saveLoader').onchange = function() {
    var file = this.files[0];
    var reader = new FileReader();
    reader.onload = function(progressEvent) {
      // By lines
      var lines = this.result.split('\n');
      // Since they are already defined by ME, I can read them
      startPosX = parseFloat(lines[0]);
      startPosY = parseFloat(lines[1]);
      canWidth = parseFloat(lines[2]);
      canHeight = parseFloat(lines[3]);
      iterNumber = parseInt(lines[4]);
      isFilled = (lines[5] != "true" ? true : false);
      canvColor[0] = parseFloat(lines[6]);
      canvColor[1] = parseFloat(lines[7]);
      canvColor[2] = parseFloat(lines[8]);
      fractBackColor[0] = parseFloat(lines[9]);
      fractBackColor[1] = parseFloat(lines[10]);
      fractBackColor[2] = parseFloat(lines[11]);
      fractColor[0] = parseFloat(lines[12]);
      fractColor[1] = parseFloat(lines[13]);
      fractColor[2] = parseFloat(lines[14]);
      // Call drawing since we are done with parsing

      console.log("Loaded. StartX ", startPosX, "- StartY ", startPosY, " width", canWidth, " height ", canHeight);
      drawFractal();
    };
    reader.readAsText(file);
  }

  // This is just for tuning
  canvas.width = window.innerWidth - 2.4;
  // Setup WebGL
  gl = WebGLUtils.setupWebGL(canvas);
  // Typicial error
  if (!gl) {
    alert("WebGL isn't available");
  }
  // Save button function
  $("#save_all").click(function() {
    // Save in this format..
    var text = startPosX + "\r\n" + startPosY + "\r\n" + canWidth + "\r\n" + canHeight + "\r\n" + iterNumber + "\r\n" + isFilled + "\r\n" + canvColor[0] + "\r\n" + canvColor[1] + "\r\n" + canvColor[2] + "\r\n" + fractBackColor[0] + "\r\n" + fractBackColor[1] + "\r\n" + fractBackColor[2] + "\r\n" + fractColor[0] + "\r\n" + fractColor[1] + "\r\n" + fractColor[2];
    var filename = "fractal_save"
    console.log("Saving. StartX ", startPosX, "- StartY ", startPosY, " width", canWidth, " height ", canHeight);
    var blob = new Blob([text], {
      type: "text/plain;charset=utf-8"
    });
    this.href = URL.createObjectURL(blob);
    this.download = filename;
  });

  // Watch for mouse down event
  canvas.addEventListener('mousedown', function(evt) {
    var mousePos = getMousePos(canvas, evt);
    startPosX = mousePos.x; // Start X coordinate
    startPosY = mousePos.y; // Stary Y coordinate
    console.log("Client X" + evt.clientX);
    selectionStarted = true; // We started to select...
  }, false);

  // Listen mouse up event. If up, get coordinates
  canvas.addEventListener('mouseup', function(evt) {
    var mousePos = getMousePos(canvas, evt); // Get position
    canWidth = mousePos.x - startPosX; // Canvas width
    canHeight = mousePos.y - startPosY; // Canvas Height
    endPosY = mousePos.y; // End position

    // Check some base conditions to detect inverted mouse movements
    if (canWidth < 0) {
      canWidth = startPosX - mousePos.x;
      startPosX = mousePos.x;
    }
    if (canHeight < 0) {
      canHeight = startPosY - mousePos.y;
      endPosY = startPosY;
      startPosY = mousePos.y;
    }

    selectionStarted = false; // Selection ended
    // Call this to start drawing
    drawFractal();
  }, false);
}

/********************** START OF TRIGGER FUNCTIONS  **************************/
// Each will change something and call drawing function. Only filling option doesnt required extra drawing workload
function canvasColorChange(event) {
  canvColor = fetchColor(event.target.value);
  drawFractal();
}

function fractalBackgroundColorChange(event) {
  fractBackColor = fetchColor(event.target.value);
  drawFractal();
}

function fractalColorChange(event) {
  fractColor = fetchColor(event.target.value);
  drawFractal();
}

function checkBoxChange() {
  if (isFilled) isFilled = false;
  else isFilled = true;

  render();
}

// Helper function
function fetchColor(colorHEX) {
  var r = parseInt(colorHEX.slice(1, 3), 16);
  var g = parseInt(colorHEX.slice(3, 5), 16);
  var b = parseInt(colorHEX.slice(5, 7), 16);
  return vec4(r * RGB_RATIO, g * RGB_RATIO, b * RGB_RATIO, 1.0);
}

function iterCountChange(elem) {
  iterNumber = elem.value;
  drawFractal();
}

// Get mouse pos.
function getMousePos(canvas, evt) {
  // Bounding rectangle gives you a fine coordinate without bounding itself to real x-y
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}
/********************* END OF TRIGGER FUNCTIONS  ******************************/

// Everything starts in here
function drawFractal() {
  // Adjust GL properties
  gl.viewport(0, 0, canvas.width, canvas.height);
  // Set clear color as canvas color
  gl.clearColor(canvColor[0], canvColor[1], canvColor[2], 1.0);
  // Init shaders
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
  // This is tricky part. Now we are creating our VERTEX buffer first. Then we are
  // filling it bufferData with size 8 * number of vertices. Which is in byte format
  // 8 bit == 1 Byte therefore numberVert byte is our size. i.e POINTER ARITMETIC
  vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);
  // Since we will change our vertex position later, we are enabling vertex attribute
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);
  // Create color buffer. Do same procedure but this time watch out for size overflow.
  // We will use double of our vertex size. This is how WebGL stores color. Still, pointer Aritmetic
  cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW);
  // We will change our colors as well, so enable these attributes as well
  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);
  // This is first initialization. So, make it true.
  first = true;
  // Clear scene.
  gl.clear(gl.COLOR_BUFFER_BIT);

  console.log("Drawing. StartX ", startPosX, "- StartY ", startPosY, " width", canWidth, " height ", canHeight);
  // Start the party
  drawRectangles(startPosX, startPosY, canWidth, canHeight, iterNumber);
}

// This method does the heavy work. It takes starting X and Y, width and height of our selected canvas and iter number
// What we are doing in here is actually really similar to class examples.
// We are filling the sub data with corresponding index. Since they are already in
// single lined array, we don't have to state their row and column
function drawRectangles(startX, startY, width, height, iterNumber) {
  // Its not possible but well.. Who knows. If its 0, return it ASAP.
  if (iterNumber == 0) return
  // If this is our first rectangle. Draw our main background.
  if (first == true) {
    // Change it to avoid stupid infinite loops.
    first = false;
    // Bind our buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)

    // Define points of corners of our rectangle.
    var left_top = vec2(2 * startX / canvas.width - 1,
      2 * (canvas.height - startY) / canvas.height - 1);
    var right_bottom = vec2(2 * (startX + width) / canvas.width - 1,
      2 * (canvas.height - (startY + height)) / canvas.height - 1);
    var left_bottom = vec2(left_top[0], right_bottom[1]);
    var right_top = vec2(right_bottom[0], left_top[1]);

    // Now we will buffer subdata for each byte with our point index.
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(left_top));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 1), flatten(left_bottom));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 2), flatten(right_bottom));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 3), flatten(right_top));

    // Now we are changing to Color buffer. We want to tell WebGL that this is the color.
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    index += 4; // Essential for pointer aritmetic.
    t = vec4(fractBackColor); // Get color.
    // We are assining same color to each point.
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 4), flatten(t));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 3), flatten(t));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 2), flatten(t));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 1), flatten(t));
    // Console to debug.
    console.log("Drawing initial blank area");
    // Inital done, recursively draw others.
    drawRectangles(startX, startY, width, height, iterNumber);
  } else {
    first = false;
    // Lets hold our new width and height. We will need them later.
    var newWidth = width / 3;
    var newHeight = height / 3;
    // State new X location and Y location.
    var newXLoc = (startX + newWidth);
    var newYLoc = (startY + newHeight);
    // State our corner coordiantes with simple geometry
    var left_top = vec2(2 * newXLoc / canvas.width - 1,
      2 * (canvas.height - newYLoc) / canvas.height - 1);
    newXLoc = (startX + newWidth + newWidth);
    newYLoc = (startY + newHeight + newHeight);
    var right_bottom = vec2(2 * newXLoc / canvas.width - 1,
      2 * (canvas.height - newYLoc) / canvas.height - 1);
    var left_bottom = vec2(left_top[0], right_bottom[1]);
    var right_top = vec2(right_bottom[0], left_top[1]);
    // Bind buffer. This is same with first if. So, no need to explain.
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(left_top));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 1), flatten(left_bottom));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 2), flatten(right_bottom));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 3), flatten(right_top));
    // Continue with color buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    index += 4;
    t = vec4(fractColor);
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 4), flatten(t));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 3), flatten(t));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 2), flatten(t));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index - 1), flatten(t));
    // For each fractal, call 8 different methods with DECREASED iternumber. This is how Sierpinski carpet looks like.
    console.log("Drawing fractal");
    drawRectangles(startX, startY, newWidth, newHeight, iterNumber - 1);
    drawRectangles(startX + newWidth, startY, newWidth, newHeight, iterNumber - 1);
    drawRectangles(startX + (newWidth * 2), startY, newWidth, newHeight, iterNumber - 1);

    drawRectangles(startX, startY + newHeight, newWidth, newHeight, iterNumber - 1);
    drawRectangles(startX + (newWidth * 2), startY + newHeight, newWidth, newHeight, iterNumber - 1);

    drawRectangles(startX, startY + (newHeight * 2), newWidth, newHeight, iterNumber - 1);
    drawRectangles(startX + newWidth, startY + (newHeight * 2), newWidth, newHeight, iterNumber - 1);
    drawRectangles(startX + (newWidth * 2), startY + (newHeight * 2), newWidth, newHeight, iterNumber - 1);
  }
  // We are all done? Then call render function to render scene.
  render();
}

// Really simple render function
function render() {
  // Get mode.
  var mode;
  if (isFilled) {
    mode = gl.TRIANGLE_FAN;
  } else {
    mode = gl.LINE_LOOP;
  }
  // Clear scene. For any case...
  gl.clear(gl.COLOR_BUFFER_BIT);
  // Now lets draw our rectangles.
  for (var i = 0; i < index; i += 4)
    gl.drawArrays(mode, i, 4);
}