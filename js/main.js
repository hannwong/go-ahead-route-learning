var MYAPP = MYAPP || { }

MYAPP.locations = {
  "Pasir Ris Interchange": {
    lat: 1.3736741,
    lng: 103.9495771
  },
  "Bedok Interchange": {
    lat: 1.3247142,
    lng: 103.9329191
  }
};

// Stores all polygons drawn on map.
// To be removed one by one. SD doesn't have a "clear all".
MYAPP.polygons = [];

// generate a random number 0 (inclusive) to n (exclusive)
MYAPP.randNumber = function(n) {
  return Math.floor((Math.random() * n));
};

// Returns a random color. Colors always in same (contrasting color) order.
// If only 2 options, red and blue will be used. If 3, then red, blue, yellow.
// And so on.
// Assumption: this.colorAnswerMapping is already reset to empty array.
MYAPP.chooseRandomColor = function (numberOfAnswerOptions, answerOptionNumber) {
  var colorSelected = this.randNumber(numberOfAnswerOptions);
  while (this.colorAnswerMapping.hasOwnProperty(String(colorSelected))) {
    // Get a color that isn't already used.
    colorSelected = this.randNumber(numberOfAnswerOptions);
  }
  this.colorAnswerMapping[String(colorSelected)] = answerOptionNumber;
  return colorSelected;
};

MYAPP.getUrlParam = function(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};

// Standard route line style
MYAPP.lineOptions = {
  color: "#FF0000",
  size: 3,
  opacity: 0.5,
  fillOpacity: 0
};

MYAPP.loadBusRoute = function() {
  if (typeof this.getUrlParam("route") == 'undefined') {
    $("#question > div").html("No route specified!<br>Specify a route in the URL, like<br>'http://&lt;hostname&gt;/?route=354'.");
    return;
  }
  $.ajax({
    url: "js/bus-routes/" + this.getUrlParam("route") + ".js",
    dataType: "script",
    success: (function() {
      this.init();
    }).bind(this),
    statusCode: {
      404: (function() {
        $("#question > div").html("Route " + "<b><u>" + this.getUrlParam("route") + "</u></b>" +
                            " is not in our system.<br>" +
                            "Please choose another route.<br>" +
                            "Or tell us to include this route!");
      }).bind(this)
    }
  });
};

MYAPP.reloadMap = function() {
  // Wait 500 ms before checking for size changes.
  setTimeout((function () {
    var newSize = { width: $("#map_canvas").width(), height: $("#map_canvas").height() };
    if (this.mapSize.width != newSize.width || this.mapSize.height != newSize.height) {
      this.mapSize = newSize;

      this.map.resizeViewport(newSize.width, newSize.height);

      // Bug in SD when resizing map!
      //   Have to wait a while before recentering map.
      //   Whether we refresh first or later, or we don't refresh, same problem.
      //   Displaces id_viewport_layer. top is 128px, left is -127.5px.
      // this.map.setCenter(center, 13);

      // Wait a while before recentering map. Minimum of 100ms.
      setTimeout((function () {
        this.playQuizQuestion(this.getUrlParam("route"), this.quizPosition);
        this.map.refresh();

        // Remove hardcoded dimensions from SD
        $("#map_canvas").css('width', '');
        $("#map_canvas").css('height', '');
      }).bind(this), 100);
    }
  }).bind(MYAPP), 100);

};

MYAPP.loadMap = function() {
  $("#map_canvas").empty();

  var latlng = new GeoPoint(this.lng, this.lat);
  // Generate SD map.
  var myOptions = {
    zoom: 13,
    center: latlng,
    showCopyright: false,
    draggable: false
  };
  this.map = new SD.genmap.Map(
    document.getElementById("map_canvas"),
    myOptions);

  // Get SD's marker manager.
  this.markerManager = new SD.genmap.MarkerStaticManager({map: this.map});
  // Get SD's Polyline manager.
  this.polylineManager = new SD.genmap.PolylineManager({map: this.map});

  // Store current size of map.
  this.mapSize = { width: $("#map_canvas").width(), height: $("#map_canvas").height() };

  // Remove hardcoded dimensions from SD
  $("#map_canvas").css('width', '');
  $("#map_canvas").css('height', '');
};

MYAPP.init = function() {
  this.selectedRoute = this.busRoute;
  var location = this.selectedRoute.start;
  this.lat = location.lat;
  this.lng = location.lng;

  if (true == this.showGoogleMapBusStops) {
    // We don't want to display the Google Map.
    // Just need it to invoke the Places API.
    googleMap = new google.maps.Map(document.createElement('div'), {
      center: {lat: -35, lng: 150},
      zoom: 14
    });
    // Get Google Map to show us bus stops around our location.
    center = new google.maps.LatLng(this.lat, this.lng);
    var request = {
      location: center,
      radius: '5000',
      type: 'bus_station'
    }
    service = new google.maps.places.PlacesService(googleMap);
    service.nearbySearch(request, this.busStopsCallback);
  }

  this.loadMap();

  window.addEventListener('orientationchange', this.reloadMap);

  // this.addBusStops();
  // this.drawBusRoute();
  this.playQuiz(this.getUrlParam("route"));
};

// TODO: File under development build. Unused in production, for now.
MYAPP.addBusStops = function() {
  // Put in our own bus stops. Check location against Google Map's.
  var busStopIcon = 'images/Bus_stop_symbol.svg';
  var routes = ["354", "358"];
  for (var i = 0; i < routes.length; i++) {
    for (var j = 0; j < this.busStops[String(routes[i])].length; j++) {
      var busStop = this.busStops[String(routes[i])][j];
      var marker = this.markerManager.add({
        position: new GeoPoint(busStop.lng, busStop.lat),
        map: this.map,
        title: this.busStops[String(routes[i])][j].ID,
        icon: busStopIcon
      });

      (function(marker, map) {
        EventManager.add(marker, "click", function() {
          // Create a SD InfoWindow.
          map.infoWindow.open(marker, "Bus stop " + marker.title);
        });
      })(marker, this.map);
    }
  }
};

MYAPP.busStopsCallback = (function(results, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {

    var googleBusStopIcon = 'https://maps.gstatic.com/mapfiles/place_api/icons/bus-71.png';

    // Show Google Map's bus stops in surrounding area.
    var marker;
    for (var i = 0; i < results.length; i++) {
      var place = results[i];

      marker = this.markerManager.add({
        position: new GeoPoint(place.geometry.location.lng(), place.geometry.location.lat()),
        map: this.map,
        icon: googleBusStopIcon
      });
    }
  }
}).bind(MYAPP);

// Bus stop icon positions differ slightly from Polyline Manager's.
MYAPP.lineToStopOffset = {lat: 0.00015, lng: 0.000015}

MYAPP.playQuiz = function(routeName) {
  this.quizPosition = 0;
  this.playQuizQuestion(routeName, this.quizPosition);
};

MYAPP.playQuizQuestion = function(routeName, quizPosition) {
  var route = this.busRoute;
  if (this.quizPosition == route.segments.length) {
    $("#question > div").html("Route complete!");
    $("#answers > div").innerHTML = "";
    return;
  }
  var segment = route.segments[this.quizPosition];

  var startLng = route.start.lng;
  var startLat = route.start.lat;

  this.markerManager.clear(); // Clear all markers.
  // Clear all polygons.
  for (i = 0; i < this.polygons.length; i++) {
    this.polylineManager.remove(this.polygons[i]);
  }
  this.polygons = [];

  var lastSegment = [];
  if (this.quizPosition > 0) {
    // Calculate current position by summing up all the correct answers thus far.
    for (var i = 0; i < this.quizPosition; i++) {
      var priorSegment = route.segments[i];
      var paths = priorSegment.answers[priorSegment.answer];
      if (route.segments[i].questionType == 'stop') {
        // "(bus) stop" question type has an "advance" attribute instead
        //   of a "correct route".
        paths = priorSegment.advance;
      }

      if (i == this.quizPosition - 1) {
        // Will be drawing the last segment in translucent black.

        // Take the beginning of the last path.
        var lastLat = startLat + this.lineToStopOffset.lat;
        var lastLng = startLng + this.lineToStopOffset.lng;
        lastSegment.push({y: lastLat, x: lastLng});

        for (var j = 0; j < paths.length; j++) {
          var offset = paths[j];
          lastLat += offset.lat;
          lastLng += offset.lng;
          lastSegment.push({y: lastLat, x: lastLng});
        }
      }

      for (var j = 0; j < paths.length; j++) {
        startLng += paths[j].lng;
        startLat += paths[j].lat;
      }
    }
  }

  // Draw lastSegment
  if (lastSegment.length > 0) {
    var lineOptions = JSON.parse(JSON.stringify(this.lineOptions));
    lineOptions.color = "#000000";
    lineOptions.opacity = 0.3;
    if ("stop" == segment.questionType) {
      // "stop" type. Make bolder and more obvious; it's the only line on screen.
      lineOptions.size = 8;
      lineOptions.opacity = 0.5;
    }
    this.polygons.push(this.polylineManager.add(lastSegment, lineOptions));
  }

  var latlng = new GeoPoint(startLng, startLat);
  this.map.panTo(latlng);

  if (0 == quizPosition) {
    // Draw bus stop icon at start of route.
    var busStopIcon = 'images/Bus_stop_symbol.svg';
    var marker = this.markerManager.add({
      position: new GeoPoint(route.start.lng, route.start.lat),
      map: this.map,
      icon: busStopIcon
    });
  }

  // Display route.
  $("#route > div").html("Route: " + routeName + "<br>" +
                         "Segment: " + quizPosition);

  var div = $("#question > div");
  if ("route" == segment.questionType) {
    div.html("Which route to take?");

    // Display possible answers
    var lineOptions = JSON.parse(JSON.stringify(this.lineOptions));

    // Starting with route lines...
    this.colorAnswerMapping = []; // Color to answer option mapping.
    for (var i = 0; i < segment.answers.length; i++) {
      var option = segment.answers[i];

      // Randomize the color representation.
      // Colored buttons are always in same (constrasting color) order.
      // Representation of answers can change.
      var colorSelected = this.chooseRandomColor(segment.answers.length, i);
      switch (colorSelected) {
      case 0: lineOptions.color = "#FF0000"; break;
      case 1: lineOptions.color = "#0000FF"; break;
      case 2: lineOptions.color = "#00ff00"; break;
      default: lineOptions.color = "#bbbb00";
      }

      var points = [];
      var lat = startLat + this.lineToStopOffset.lat;
      var lng = startLng + this.lineToStopOffset.lng;
      points.push({y: lat, x: lng});

      for (var j = 0; j < option.length; j++) {
        var offset = option[j];
        lat += offset.lat;
        lng += offset.lng;
        points.push({y: lat, x: lng});
      }

      // Add the polygon, and store it for later deletion.
      this.polygons.push(this.polylineManager.add(points, lineOptions));
    }
    // Then with buttons...
    this.displayAnswerButtons(routeName, quizPosition);
  }
  else if ("stop" == segment.questionType) {
    div.html("Where is next bus stop?");

    // Display possible answers
    var lineOptions = JSON.parse(JSON.stringify(this.lineOptions));
    var busStopIcon = 'images/Bus_stop_symbol.svg';

    // Starting with bus stops...
    this.colorAnswerMapping = []; // Color to answer option mapping.
    for (var i = 0; i < segment.answers.length; i++) {
      var option = segment.answers[i];

      // Randomize the color representation.
      var colorSelected = this.chooseRandomColor(segment.answers.length, i);
      busStopIcon = 'images/Bus_stop_symbol_';
      switch (colorSelected) {
      case 0: busStopIcon += 'red'; break;
      case 1: busStopIcon += 'blue'; break;
      case 2: busStopIcon += 'green'; break;
      default: busStopIcon += 'yellow';
      }
      busStopIcon += '.svg';

      var marker = this.markerManager.add({
        position: new GeoPoint(option.lng, option.lat),
        map: this.map,
        icon: busStopIcon
      });
    }
    // Then with buttons...
    this.displayAnswerButtons(routeName, quizPosition);
  }
};

MYAPP.displayAnswerButtons = function(routeName, quizPosition) {
  var route = this.busRoute;
  var segment = route.segments[this.quizPosition];

  var div = $("#answers div");
  div.html('');
  var answers = '';
  for (var i = 0; i < segment.answers.length; i++) {
    var color = "#bbbb00";
    // Choose appropriate constrasting color.
    switch (i) {
    case 0: color = "#FF0000"; break;
    case 1: color = "#0000FF"; break;
    case 2: color = "#00ff00";
    }
    answers += '<div class="answer">' +
      '<button class="answer" style="background-color: ' + color + '" ' +
      'onclick="MYAPP.answerQuiz(' + i + ", '" + routeName + "'" + ')"></button>' +
      '</div>';
  }
  div.html(answers);
};

MYAPP.answerQuiz = function(optionNumber, routeName) {
  route = this.busRoute;
  var segment = route.segments[this.quizPosition];
  if (this.colorAnswerMapping[String(optionNumber)] == segment.answer) {
    this.quizPosition++;
    this.playQuizQuestion(routeName, this.quizPosition);
  }
  else {
    $('#myModal').modal('show');
  }
};

MYAPP.drawBusRoute = function() {
  var lineOptions = {
    color: "#FF0000",
    size: 3,
    opacity: 0.5,
    fillOpacity: 0
  };

  var points = [];

  var route = this.busRoute;
  // Push first point, the start of the route. The rest will be offsets.
  var lat = route.start.lat + this.lineToStopOffset.lat;
  var lng = route.start.lng + this.lineToStopOffset.lng;
  points.push({y: lat, x: lng});

  // Print 1st segment.
  var segment = route.segments[0];
  for (var i = 0; i < segment.length; i++) {
    var offset = segment[i];
    lat += offset.lat;
    lng += offset.lng;
    points.push({y: lat, x: lng});
  }

  this.polylineManager.add(points, lineOptions);

  // Print 2nd segment.
  points = [{y: lat, x: lng}]; // reset points.
  var segment = route.segments[1];
  for (var i = 0; i < segment.length; i++) {
    var offset = segment[i];
    lat += offset.lat;
    lng += offset.lng;
    points.push({y: lat, x: lng});
  }

  lineOptions.color = "#0000FF";

  this.polylineManager.add(points, lineOptions);
};
