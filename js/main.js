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

MYAPP.init = function() {
  this.selectedRoute = this.busRoutes["354"];
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

  // Generate SD map.
  var latlng = new GeoPoint(this.lng, this.lat);
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

  // this.addBusStops();
  // this.drawBusRoute();
  this.playQuiz(this.selectedRoute);
};

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

MYAPP.playQuiz = function(route) {
  MYAPP.quizPosition = 0;
  // Draw bus stop icon at start of route.
  var busStopIcon = 'images/Bus_stop_symbol.svg';
  var marker = this.markerManager.add({
    position: new GeoPoint(route.start.lng, route.start.lat),
    map: this.map,
    icon: busStopIcon
  });

  var segment = route.segments[this.quizPosition];
  var div = document.getElementById("question");
  if ("route" == segment.questionType) {
    div.innerHTML = "Which route to take?";

    // Display possible answers
    var lineOptions = {
      color: "#FF0000",
      size: 3,
      opacity: 0.5,
      fillOpacity: 0
    };
    for (var i = 0; i < segment.answers.length; i++) {
      var option = segment.answers[i];

      // Choose appropriate constrasting color.
      switch (i) {
      case 0: lineOptions.color = "#FF0000"; break;
      case 1: lineOptions.color = "#0000FF"; break;
      case 2: lineOptions.color = "#FFFF00"; break;
      default: lineOptions.color = "#00FF00";
      }

      var points = [];
      var lat = route.start.lat + this.lineToStopOffset.lat;
      var lng = route.start.lng + this.lineToStopOffset.lng;
      points.push({y: lat, x: lng});

      for (var j = 0; j < option.length; j++) {
        var offset = option[j];
        lat += offset.lat;
        lng += offset.lng;
        points.push({y: lat, x: lng});
      }

      this.polylineManager.add(points, lineOptions);
    }
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

  var route = this.busRoutes["354"];
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
