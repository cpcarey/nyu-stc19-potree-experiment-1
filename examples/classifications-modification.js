import * as THREE from "../libs/three.js/build/three.module.js";
import {Line2} from "../libs/three.js/lines/Line2.js";
import {LineGeometry} from "../libs/three.js/lines/LineGeometry.js";
import {LineMaterial} from "../libs/three.js/lines/LineMaterial.js";

const CODE = '22242';
const URL_CLOUD = `http://localhost:1234/data/${CODE}.las_converted/metadata.json`;

    //'http://5.9.65.151/mschuetz/potree/resources/pointclouds/opentopography' +
    //'/CA13_1.4/cloud.js';

function add(v1, v2) {
  return {
    x: v1.x + v2.x,
    y: v1.y + v2.y,
    z: v1.z + v2.z,
  };
}

function getMid(v1, v2) {
  return {
    x: (v1.x + v2.x) / 2,
    y: (v1.y + v2.y) / 2,
    z: (v1.z + v2.z) / 2,
  };
}

const LAT_MIN = 40.8391;
const LAT_MAX = 40.8322;
const LON_MIN = -73.8618;
const LON_MAX = -73.8527;

function run(linesInLatLon) {
  const viewer =
      new Potree.Viewer(document.getElementById('potree_render_area'));
  viewer.setEDLEnabled(true);
  viewer.setFOV(60);
  viewer.setPointBudget(2_000_000);

  Potree.loadPointCloud(URL_CLOUD, CODE, (e) => {
    viewer.scene.addPointCloud(e.pointcloud);
    e.pointcloud.position.z = 0;

    const material = e.pointcloud.material;
    material.size = 3;
    material.pointSizeType = Potree.PointSizeType.FIXED;
    material.activeAttributeName = 'classification';

    const min = e.pointcloud.position;
    const delta = e.pointcloud.boundingBox.max;
    const max = add(min, delta);

    const mid = getMid(min, max);
    const q3 = getMid(mid, max);
    const q1 = getMid(min, mid);

    viewer.scene.view.position.set(q1.x-500, q1.y+500, 800);
    viewer.scene.view.lookAt(q1.x-100, q1.y+1000, 100);

    const paths = linesInLatLon.map((lineInLatLon) => {
      console.log(lineInLatLon);
      return lineInLatLon.map(([lon, lat]) => {
        return [
          ...latLonToCoordSpace(
              min.x,
              max.x,
              min.y,
              max.y,
              LON_MIN,
              LON_MAX,
              LAT_MIN,
              LAT_MAX,
              parseFloat(lon),
              parseFloat(lat),
            ),
          160,
        ];
      }).reduce((a, b) => [...a, ...b]);
    });

    const lineGeometries = paths.map((path) => {
      const lineGeometry = new LineGeometry();
      lineGeometry.setPositions(path);
      return lineGeometry;
    });

    const lineMaterial = new LineMaterial({
      color: 0x00ff00,
      dashSize: 5,
      gapSize: 2,
      linewidth: 10,
      opacity: 0.2,
      resolution: new THREE.Vector2(1000, 1000),
      transparent: true,
    });

    viewer.addEventListener('update', () => {
      viewer.renderer.getSize(lineMaterial.resolution);
    });

    for (const lineGeometry of lineGeometries) {
      const line = new Line2(lineGeometry, lineMaterial);
      viewer.scene.scene.add(line);
    }
  });
};

function latLonToCoordSpace(xMin, xMax, yMin, yMax, lonMin, lonMax, latMin, latMax, lon, lat) {
  const dx = xMax - xMin;
  const dy = yMax - yMin;
  const dLon = lonMax - lonMin;
  const dLat = latMax - latMin;

  const x = ((lon - lonMin) / dLon) * dx + xMin;
  const y = yMax - ((lat - latMin) / dLat) * dy;
  return [x, y];
}

function getLines() {
  const request = new XMLHttpRequest();
  request.open('GET', 'http://localhost:1234/data/20200331CC_lines.json', true);
  request.onload = function() {
    const parsed = `[${this.response.replace(/\r?\n|\r\t/g, '').replaceAll('}{', '},{')}]`;
    const json = JSON.parse(parsed);
    const lines = json.map((feature) => {
      const coords = feature.geometry.coordinates[0];
      return coords[0];
    });
    run(lines);
  };
  request.send();
}

document.addEventListener('DOMContentLoaded', getLines);
