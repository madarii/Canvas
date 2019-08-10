document.addEventListener("DOMContentLoaded", function() {
    var default_color = 'black';
    var color = default_color;
    var fillEnable = false;

    var mouse = {
        click: false,
        move: false,
        pos: {
            x: 0,
            y: 0
        },
        pos_prev: false
    };

    var circle = {
        center: false,
        radius: 0,
        toolType: 0
    };

    var rectangle = {
        top: false,
        height: 0,
        width: 0
    };

    var triangle = {
        startPoint: false,
        point1: 0,
        point2: 0,
    };

    var eraser = {
        center: false,
        radius: 0,
        click: false,
        oncanvas: false
    };

    var line = {
        point1: false,
        point2: 0
    };

    var brush = {
        center: false,
        radius: 0,
        click: false,
        oncanvas: false
    };

    // get temp canvas element and create context
    var canvastemp = document.getElementById('drawingtemp');
    var contexttemp = canvastemp.getContext('2d');

    //get main canvas element and create context
    var canvas = document.getElementById('drawing');
    var context = canvas.getContext('2d');

    //get eraser canvas element and create context
    //only used to draw eraser outline while using eraser
    var canvaseraser = document.getElementById('drawingeraser');
    var erasercontext = canvaseraser.getContext('2d');

    var width = window.innerWidth * 0.45;
    var height = window.innerHeight * 0.65;
    var socket = io.connect('http://'+ location.hostname + ':1337');
    var scaleX;
    var scaleY;
    var rect;

    var toolbar = document.getElementById('toolbar');
    var tool = 'pencil' //defualt tool is pencil
    var clickFillEnable = document.getElementById('fill');

    toolbar.addEventListener("click", selectTool);

    //function for tool selection
    function selectTool(toolButton) {
        if (toolButton.target !== toolButton.currentTarget) {
            tool = toolButton.target.closest('button').id;
            if (tool == 'fill') {
                if (fillEnable) {
                    clickFillEnable.style.backgroundColor = '';
                    fillEnable = false;
                } else {
                    clickFillEnable.style.backgroundColor = color;
                    fillEnable = true;
                }
            }

            toolButton.stopPropagation();
        }
    }

    // set canvas to full browser width/height
    canvastemp.width = width;
    canvastemp.height = height;
    canvas.width = width;
    canvas.height = height;
    canvaseraser.width = width;
    canvaseraser.height = height;

    // register mouse event handlers
    canvastemp.onmousedown = function(e) {
        mouse.click = true;
        if (eraser.center)
            eraser.click = true;
        if (brush.center)
            brush.click = true;
    };

    canvastemp.onmouseup = function(e) {
        //mouse up means user have finished drawing the shape
        //make all the "tool is active" flags to false
        mouse.click = false;
        circle.center = false;
        rectangle.top = false;
        triangle.startPoint = false;
        eraser.click = false;
        eraser.center = false;
        brush.click = false;
        brush.center = false;
        line.point1 = false;
        socket.emit('clear_eraser_canvas');
        //update the main canvas
        socket.emit('update_canvas');
    };

    canvastemp.onmouseleave = function(e) {
        eraser.oncanvas = false;
        brush.oncanvas = false;
        socket.emit('clear_temp_canvas');
    }

    canvastemp.onmouseenter = function(e) {
        eraser.oncanvas = true;
        brush.oncanvas = true;
    }

    socket.on('update_canvas', function() {
        img_update();
    })

    socket.on('clear_temp_canvas', function() {
        //console.log('leave');
        contexttemp.clearRect(0, 0, canvastemp.width, canvastemp.height);
    });

    socket.on('clear_eraser_canvas', function() {
        erasercontext.clearRect(0, 0, canvastemp.width, canvastemp.height);
    });

    //calculates mouse position on canvas wrt to the canvas 
    //it also considers scaling
    function getMousePos(canvas, evt) {
        rect = canvas.getBoundingClientRect();
        scaleX = canvas.width / rect.width;
        scaleY = canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    canvastemp.onmousemove = function(e) {
        // normalize mouse position to range 0.0 - 1.0
        mouse.pos = getMousePos(canvastemp, e);
        if (eraser.click || brush.click) {
            //img_update();
            socket.emit('update_canvas');
        }
        mouse.move = true;
    };

    document.getElementById('clear_button').addEventListener("click", function() {
        socket.emit('clear_canvas');
    });

    // draw line received from server
    socket.on('draw_pencil', function(data) {
        var line = data.line;
        contexttemp.beginPath();
        contexttemp.moveTo(line[1].x, line[1].y);
        contexttemp.lineTo(line[0].x, line[0].y);
        contexttemp.strokeStyle = data.color;
        contexttemp.lineWidth = 2;
        contexttemp.stroke();
        //img_update();
    });

    //draw circle received from server
    socket.on('draw_circle', function(data) {
        //inside circle draw
        var circle = data.circle;
        var toolType = data.toolType;
        var fillEnable = data.fillFlag;

        contexttemp.clearRect(0, 0, canvastemp.width, canvastemp.height);
        contexttemp.beginPath();
        contexttemp.arc(circle.center.x, circle.center.y, circle.radius, 0, 2 * Math.PI);

        if (circle.click) {
            if (toolType == 'eraser') {
                contexttemp.fillStyle = "white";
                contexttemp.fill();
            } else {
                contexttemp.fillStyle = data.color;
                contexttemp.fill();
            }

            //create eraser outline on eraser canvas
            erasercontext.clearRect(0, 0, canvastemp.width, canvastemp.height);
            erasercontext.beginPath();
            erasercontext.arc(circle.center.x, circle.center.y, circle.radius, 0, 2 * Math.PI);
            erasercontext.strokeStyle = color;
            erasercontext.lineWidth = 2;
            erasercontext.stroke();
        } else {
            if (fillEnable) {
                contexttemp.fillStyle = data.color;
                contexttemp.fill();
            } else {
                contexttemp.strokeStyle = data.color;
                contexttemp.lineWidth = 2;
                contexttemp.stroke();
            }
        }
    })

    socket.on('draw_square', function(data) {
        var square = data.square;
        var fillEnable = data.fillFlag;
        contexttemp.clearRect(0, 0, canvastemp.width, canvastemp.height);
        contexttemp.beginPath();
        contexttemp.rect(square.top.x, square.top.y, square.width, square.height);
        if (fillEnable) {
            contexttemp.fillStyle = data.color;
            contexttemp.fill();
        } else {
            contexttemp.strokeStyle = data.color;
            contexttemp.lineWidth = 2;
            contexttemp.stroke();
        }
    });

    socket.on('draw_triangle', function(data) {
        var triangle = data.triangle;
        var fillEnable = data.fillFlag;
        contexttemp.clearRect(0, 0, canvastemp.width, canvastemp.height);
        contexttemp.beginPath();
        contexttemp.moveTo(triangle.startPoint.x, triangle.startPoint.y);
        contexttemp.lineTo(triangle.point1.x, triangle.point1.y);
        contexttemp.lineTo(triangle.point2.x, triangle.point2.y);
        contexttemp.lineTo(triangle.startPoint.x, triangle.startPoint.y);
        if (fillEnable) {
            contexttemp.fillStyle = data.color;
            contexttemp.fill();
        } else {
            contexttemp.strokeStyle = data.color;
            contexttemp.lineWidth = 2;
            contexttemp.stroke();
        }
    });

    socket.on('draw_line', function(data) {
        var line = data.line;
        contexttemp.clearRect(0, 0, canvastemp.width, canvastemp.height);
        contexttemp.beginPath();
        contexttemp.moveTo(line.point1.x, line.point1.y);
        contexttemp.lineTo(line.point2.x, line.point2.y);
        contexttemp.strokeStyle = data.color;
        contexttemp.lineWidth = 2;
        contexttemp.stroke();
    });

    //clears main canvas
    socket.on('clear_canvas', function() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    });

    //copy temporary canvas image to main canvas
    function img_update() {
        context.drawImage(canvastemp, 0, 0);
        contexttemp.clearRect(0, 0, canvastemp.width, canvastemp.height);
    }

    //calulate distance between two points
    function calDistance(x, y) {
        return Math.sqrt(Math.pow(x - mouse.pos.x, 2) + Math.pow(y - mouse.pos.y, 2));
    }

    //color picker tool using color-picker-master library 
    //initializing color picker
    var source = document.querySelector('#color');

    // show color picker by click (default)
    var picker = new CP(source);

    //add click event listener to color button

    var button = document.getElementById('#color')

    // show color picker by hover
    var picker = new CP(source, "click");

    picker.set([0, 0, 0]); // HSV color value, range from `0` to `1` for each

    picker.on("change", function(color_chosen) {
        source.style.backgroundColor = '#' + color_chosen;
        color = '#' + color_chosen;
    });



    // main loop, running every 25ms
    function mainLoop() {
        eraser.center = false;
        brush.center = false;

        //draws eraser(circle) when mouse is over screen and erases when clicked
        if (tool == 'eraser' && eraser.oncanvas) {
            eraser.center = {
                x: mouse.pos.x,
                y: mouse.pos.y
            };
            eraser.radius = 15;
            socket.emit('draw_circle', {
                circle: eraser,
                toolType: 'eraser',
                fillFlag: false,
                color: color
            });
        }

        //draws brush(circle) when mouse is over screen and paints when clicked
        if (tool == 'brush' && brush.oncanvas) {
            brush.center = {
                x: mouse.pos.x,
                y: mouse.pos.y
            };
            brush.radius = 10;
            socket.emit('draw_circle', {
                circle: brush,
                toolType: 'brush',
                color: color
            });
        }

        // check if the user is drawing
        if (mouse.click && mouse.move) {
            switch (tool) {
                case "pencil":
                    // send line to to the server
                    if (mouse.pos_prev) {
                        socket.emit('draw_pencil', {
                            line: [mouse.pos, mouse.pos_prev],
                            color: color
                        });
                        mouse.move = false;
                    }
                    break;
                case "circle":
                    //circle tool
                    if (!circle.center)
                        circle.center = {
                            x: mouse.pos.x,
                            y: mouse.pos.y
                        };
                    circle.radius = calDistance(circle.center.x, circle.center.y);
                    socket.emit('draw_circle', {
                        circle: circle,
                        toolType: 'circle',
                        fillFlag: fillEnable,
                        color: color
                    });
                    break;

                case "square":
                    //square tool
                    if (!rectangle.top)
                        rectangle.top = {
                            x: mouse.pos.x,
                            y: mouse.pos.y
                        };
                    rectangle.width = rectangle.height = mouse.pos.x - rectangle.top.x;
                    socket.emit('draw_square', {
                        square: rectangle,
                        fillFlag: fillEnable
                    });
                    break;

                case "rectangle":
                    //rectangle tool
                    if (!rectangle.top)
                        rectangle.top = {
                            x: mouse.pos.x,
                            y: mouse.pos.y
                        };
                    rectangle.width = mouse.pos.x - rectangle.top.x;
                    rectangle.height = mouse.pos.y - rectangle.top.y;
                    socket.emit('draw_square', {
                        square: rectangle,
                        fillFlag: fillEnable,
                        color: color
                    });
                    break;

                case "triangle":
                    //triangle tool
                    if (!triangle.startPoint)
                        triangle.startPoint = {
                            x: mouse.pos.x,
                            y: mouse.pos.y
                        };
                    triangle.point1 = {
                        x: mouse.pos.x,
                        y: mouse.pos.y
                    };
                    triangle.point2 = {
                        x: triangle.startPoint.x - (triangle.point1.x - triangle.startPoint.x),
                        y: triangle.point1.y
                    }
                    socket.emit('draw_triangle', {
                        triangle: triangle,
                        fillFlag: fillEnable,
                        color: color
                    });
                    break;

                case "line":
                    //line tool
                    console.log('line')
                    if (!line.point1)
                        line.point1 = {
                            x: mouse.pos.x,
                            y: mouse.pos.y
                        };
                    line.point2 = {
                        x: mouse.pos.x,
                        y: mouse.pos.y
                    };
                    socket.emit('draw_line', {
                        line: line,
                        color: color
                    });
                    break;
            }
        }
        //records the previous position of mouse to draw line from previous
        //position to curruent mouse position
        mouse.pos_prev = {
            x: mouse.pos.x,
            y: mouse.pos.y
        };
        setTimeout(mainLoop, 25);
    }
    mainLoop();
});
