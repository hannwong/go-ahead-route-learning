#!/usr/bin/env node


'use strict';

var yaml = require('js-yaml');
var fs = require('fs');

try {
  var doc = yaml.safeLoad(fs.readFileSync('data/bus-routes.yaml', 'utf8'));
  console.log(doc);
  for (var routeName in doc) {
    fs.writeFileSync('js/bus-routes/' + routeName + '.js',
                     'MYAPP.busRoute = ' +
                     JSON.stringify(doc[routeName], null, 4) + ';',
                     'utf8');
  }
} catch (e) {
  console.log(e);
}
