/*jshint esversion: 6 */

var cdy;

var data = {
  surfaces: [{
    fun: "(x ^ 2 + y ^ 2 + z ^ 2 - (0.5 + a) ^ 2) ^ 2 - (3.0 * ((0.5 + a) ^ 2) - 1.0) / (3.0 - ((0.5 + a) ^ 2)) * (1 - z - sqrt(2) * x) * (1 - z + sqrt(2) * x) * (1 + z + sqrt(2) * y) * (1 + z - sqrt(2) * y)",
    frontcolor: "#516594",
    backcolor: "#c47c17",
    alpha: 1
  }]
};

function hex2ccolor(hex) {
  var bigint = parseInt(hex.slice(1), 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  return `[${r/255}, ${g/255}, ${b/255}]`;
}

function updatesurfaces(surfaces) {
  for (let k = 0; k < surfaces.length; k++) {
    cdy.evokeCS(`fun${k}(x,y,z) := (${surfaces[k].fun});
        diff(fun${k}(x,y,z), x, dxfun${k}(x,y,z) := #);
        diff(fun${k}(x,y,z), y, dyfun${k}(x,y,z) := #);
        diff(fun${k}(x,y,z), z, dzfun${k}(x,y,z) := #);
        `);
  }
  cdy.evokeCS(`
    Nsurf = ${surfaces.length};
    //F takes vec3 instead of 3 variables
    F(p) := (p=p/zoom;[
      ${surfaces.map((s,k)=>`fun${k}(p.x, p.y, p.z)`).join(', ')}
    ]);
    dF(p) := (p=p/zoom;[
      ${surfaces.map((s,k)=>`[
        dxfun${k}(p.x, p.y, p.z),
        dyfun${k}(p.x, p.y, p.z),
        dzfun${k}(p.x, p.y, p.z)
        ]`).join(', ')}
    ]);
    frontcolors = [${surfaces.map(s => hex2ccolor(s.frontcolor)).join(",")}];
    backcolors = [${surfaces.map(s => hex2ccolor(s.backcolor)).join(",")}];
    alphas = [${surfaces.map(s => s.alpha).join(",")}];
  `);
}

let scripts = {};
Promise.all(
    [
      'init',
      'draw',
      'mousedown',
      'mouseup'
    ].map(
      script =>
      fetch(`raycaster/${script}.cs`)
      .then(r => r.text())
      .then(txt => scripts[script] = txt)
    )
  )
  .then(function() {
    cdy = CindyJS({
      canvasname: "CSCanvas",
      scripts: scripts,
      animation: {
        autoplay: false
      },
      use: ["CindyGL", "katex", "symbolic"],
      geometry: [{
          name: "PA",
          kind: "P",
          type: "Free",
          pos: [0.5, 0.37, 1],
          narrow: true,
          color: [1, 1, 1],
          size: 8
        },
      /*  {
          name: "PB",
          kind: "P",
          type: "Free",
          pos: [0.5, 0.5, 1],
          narrow: true,
          color: [1, 1, 1],
          size: 8
        },*/
        {
          name: "PC",
          kind: "P",
          type: "Free",
          pos: [0.5, 0.1, 1],
          narrow: true,
          color: [1, 1, 1],
          size: 8
        }
      ],
      ports: [{
        id: "CSCanvas",
        //width: 700,
        //height: 500,
        //fill: "window",
        transform: [{
          visibleRect: [-0.5, 0.7, 0.5, -0.7]
        }]
      }],
    });
    updatesurfaces(data.surfaces);
  });



window.addEventListener('DOMContentLoaded', (event) => {
  Vue.component('surface-component', {
    props: ["surface", "onesurface", "index"],
    template: `
    <div class="surface">
      <div>
        {{ surface.fun }}
      </div>
      <div>
        <input type="text" v-model="surface.fun">
      </div>
      <div>
        <input type="color" v-model="surface.frontcolor">
        <input type="color" v-model="surface.backcolor">
        <input type="range" min="0" step=".01" max="1" v-model="surface.alpha">
      </div>
      <button v-on:click="remove(surface)" v-if="!onesurface">delete surface</button>
    </div>`,
    methods: {
      remove: function(s2d) {
        data.surfaces = data.surfaces.filter(s => (s !== s2d));
      }
    },
    watch: {
      "surface.fun": function(fun) {
        let k = this.index;
        cdy.evokeCS(`fun${k}(x,y,z) := (${fun});
        diff(fun${k}(x,y,z), x, dxfun${k}(x,y,z) := #);
        diff(fun${k}(x,y,z), y, dyfun${k}(x,y,z) := #);
        diff(fun${k}(x,y,z), z, dzfun${k}(x,y,z) := #);
        `);
      },
      "surface.frontcolor": function(color) {
        cdy.evokeCS(`frontcolors_${this.index+1} = ${hex2ccolor(color)};`);
      },
      "surface.backcolor": function(color) {
        cdy.evokeCS(`backcolors_${this.index+1} = ${hex2ccolor(color)};`);
      },
      "surface.alpha": function(alpha) {
        cdy.evokeCS(`alphas_${this.index+1} = ${alpha};`);
      }
    }
  });
  

  var app = new Vue({
    el: '#app',
    data: data,
    methods: {
      add: () => {
        data.surfaces.push({
          fun: "x^2+y^2+z^2-1",
          frontcolor: "#bbbbbb",
          backcolor: "#50aa20",
          alpha: 1
        });
      },
      addcoordinates: () => {
        data.surfaces.push({
          fun: "y^2+z^2+x*(x-1)^3*((x-.25)^2+.02)",
          frontcolor: "#ff0000",
          backcolor: "#ff0000",
          alpha: 1
        });
        data.surfaces.push({
          fun: "x^2+z^2+y*(y-1)^3*((y-.25)^2+.02)",
          frontcolor: "#00ff00",
          backcolor: "#00ff00",
          alpha: 1
        });
        data.surfaces.push({
          fun: "x^2+y^2+z*(z-1)^3*((z-.25)^2+.02)",
          frontcolor: "#0000ff",
          backcolor: "#0000ff",
          alpha: 1
        });
      },
    },
    watch: {
      surfaces: updatesurfaces
    }
  });
});
