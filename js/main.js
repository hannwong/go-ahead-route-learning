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
  var location = this.locations["Pasir Ris Interchange"];
  // var location = this.locations["Bedok Interchange"];
  var location = this.busStops["354"][10];
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
    draggable: true
  };
  this.map = new SD.genmap.Map(
    document.getElementById("map_canvas"),
    myOptions);

  // Get SD's marker manager.
  this.markerManager = new SD.genmap.MarkerStaticManager({map: this.map});

  this.addBusStops();
};

MYAPP.addBusStops = function() {
  // Put in our own bus stops. Check location against Google Map's.
  var busStopIcon = 'images/Bus_stop_symbol.svg';
  var routes = ["354", "358"];
  var marker;
  for (var i = 0; i < routes.length; i++) {
    for (var j = 0; j < this.busStops[String(routes[i])].length; j++) {
      var busStop = this.busStops[String(routes[i])][j];
      marker = this.markerManager.add({
        position: new GeoPoint(busStop.lng, busStop.lat),
        map: this.map,
        title: this.busStops[String(routes[i])][j].ID,
        icon: busStopIcon
      });
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
