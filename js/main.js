var MYAPP = MYAPP || {
  locations: {
    "Pasir Ris Interchange": {
      lat: 1.3712723,
      lng: 103.9531163
    },
    "Bedok Interchange": {
      lat: 1.3247142,
      lng: 103.9329191
    }
  },

  init: function() {
    var location = this.locations["Pasir Ris Interchange"];
    // var location = this.locations["Bedok Interchange"];
    this.lat = location.lat;
    this.lng = location.lng;

    // We don't want to display the Google Map.
    // Just need it to invoke the Places API.
    googleMap = new google.maps.Map(document.createElement('div'), {
      center: {lat: -35, lng: 150},
      zoom: 14
    });

    // Get bus stops around our location.
    center = new google.maps.LatLng(this.lat, this.lng);
    var request = {
        location: center,
        radius: '500',
        type: 'bus_station'
    }
    service = new google.maps.places.PlacesService(googleMap);
    service.nearbySearch(request, this.busStopsCallback);

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
  },

  busStopsCallback: function(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {

      var image = 'https://maps.gstatic.com/mapfiles/place_api/icons/bus-71.png';

      // Generate SD map again here, just for the marker manager.
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
      var markerManager = new SD.genmap.MarkerStaticManager({map: this.map});

      for (var i = 0; i < results.length; i++) {
        var place = results[i];
        console.log("Bus stop " + i + ": " +
                    place.geometry.location.lat() + ", " +
                    place.geometry.location.lng());


        var marker = markerManager.add({
          position: new GeoPoint(place.geometry.location.lng(), place.geometry.location.lat()),
          map: this.map,
          icon: image
        });
      }
    }
  }
};
