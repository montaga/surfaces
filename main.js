/*jshint esversion: 6 */

var cdy;

var MQ = MathQuill.getInterface(2); // for backcompat


var data = {
  surfaces: [{
    //fun: "(x ^ 2 + y ^ 2 + z ^ 2 - (0.5 + a) ^ 2) ^ 2 - (3.0 * ((0.5 + a) ^ 2) - 1.0) / (3.0 - ((0.5 + a) ^ 2)) * (1 - z - sqrt(2) * x) * (1 - z + sqrt(2) * x) * (1 + z + sqrt(2) * y) * (1 + z - sqrt(2) * y)",
    //latex: `{\left({x}^{2}+{y}^{2}+{z}^{2}-{\left(\frac{1}{{2}}+{a}\right)}^{2}\right)}^{2}-\frac{{{3}\cdot{\left({\left(\frac{1}{{2}}+{a}\right)}^{2}\right)}-{1}}}{{{3}-{\left({\left(\frac{1}{{2}}+{a}\right)}^{2}\right)}}}\cdot{\left({1}-{z}-\sqrt{{{2}}}\cdot{x}\right)}\cdot{\left({1}-{z}+\sqrt{{{2}}}\cdot{x}\right)}\cdot{\left({1}+{z}+\sqrt{{{2}}}\cdot{y}\right)}\cdot{\left({1}+{z}-\sqrt{{{2}}}\cdot{y}\right)}`,
    latex: `x^2+y^2+z^2-2`,
    frontcolor: "#516594",
    backcolor: "#c47c17",
    alpha: 1
  }],
  backgroundcolor: "#888888",
  lightcolor: "#333333"
};

function hex2ccolor(hex) {
  var bigint = parseInt(hex.slice(1), 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  return `[${r/255}, ${g/255}, ${b/255}]`;
}

function latex2csterm(latex) {
  //adopted from https://stackoverflow.com/a/18499089
  return latex
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, "($1)/($2)") // fractions
    .replace(/\\cdot/g, "*")
    .replace(/\\left\(/g, "(") // open parenthesis
    .replace(/\\right\)/g, ")") // close parenthesis
    .replace(/[^\(](floor|ceil|(sin|cos|tan|sec|csc|cot)h?)\(([^\(\)]+)\)[^\)]/g, "($&)") // functions
    .replace(/([^(floor|ceil|(sin|cos|tan|sec|csc|cot)h?|\+|\-|\*|\/)])\(/g, "$1*(")
    .replace(/\)([\w])/g, ")*$1")
    .replace(/([0-9])([A-Za-z])/g, "$1*$2");
}

function updatesurfaces(surfaces) {
  for (let k = 0; k < surfaces.length; k++) {
    updatesurface(k);
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

function updatesurface(k) {
  cdy.evokeCS(`fun${k}(x,y,z) := (${data.surfaces[k].fun});
  ////fallbacks if diff does not work
  eps = 0.01;
  dxfun${k}(x,y,z) := (fun${k}(x+eps,y,z)-fun${k}(x-eps,y,z))/(2*eps);
  dyfun${k}(x,y,z) := (fun${k}(x,y+eps,z)-fun${k}(x,y-eps,z))/(2*eps);
  dzfun${k}(x,y,z) := (fun${k}(x,y,z+eps)-fun${k}(x,y,z-eps))/(2*eps);
  diff(fun${k}(x,y,z), x, dxfun${k}(x,y,z) := #);
  diff(fun${k}(x,y,z), y, dyfun${k}(x,y,z) := #);
  diff(fun${k}(x,y,z), z, dzfun${k}(x,y,z) := #);
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
      use: ["CindyGL", "symbolic"],
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
        {{ surface.latex }}
      </div>
      <div>
        <textarea type="text" v-model="surface.fun"></textarea>
      </div>
      <div>
        <span class="math-field" ref="math"></span>
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
        updatesurface(this.index);
      },
      "surface.frontcolor": function(color) {
        cdy.evokeCS(`frontcolors_${this.index+1} = ${hex2ccolor(color)};`);
      },
      "surface.backcolor": function(color) {
        cdy.evokeCS(`backcolors_${this.index+1} = ${hex2ccolor(color)};`);
      },
      "surface.alpha": function(alpha) {
        cdy.evokeCS(`alphas_${this.index+1} = ${alpha};`);
      },
      "surface.latex": function(latex) {
          //adopted from https://stackoverflow.com/a/18499089
          this.surface.fun = latex2csterm(latex);
        }
    },
    mounted: function() {
      this.mathField = MQ.MathField(this.$refs.math, {
        spaceBehavesLikeTab: true, // configurable
        handlers: {
          edit: () => { // useful event handlers
            this.surface.latex = this.mathField.latex(); // simple API
          }
        }
      });
      this.mathField.latex(this.surface.latex);
      this.surface.fun = latex2csterm(this.surface.latex);
    },
  });


  var app = new Vue({
    el: '#app',
    data: data,
    methods: {
      add: () => {
        data.surfaces.push({
          fun: "x^2+y^2+z^2-1",
          latex: "x^2+y^2+z^2-1",
          frontcolor: "#bbbbbb",
          backcolor: "#50aa20",
          alpha: 1
        });
      },
      addcoordinates: () => {
        data.surfaces.push({
          latex: "y^2+z^2+x\\cdot\\left(x-1\\right)^3\\cdot\\left(\\left(x-\\frac{1}{4}\\right)^2+0.02\\right)",
          frontcolor: "#ff0000",
          backcolor: "#ff0000",
          alpha: 1
        });
        data.surfaces.push({
          latex: "x^2+z^2+y\\cdot\\left(y-1\\right)^3\\cdot\\left(\\left(y-\\frac{1}{4}\\right)^2+0.02\\right)",
          frontcolor: "#00ff00",
          backcolor: "#00ff00",
          alpha: 1
        });
        data.surfaces.push({
          latex: "x^2+y^2+z\\cdot\\left(z-1\\right)^3\\cdot\\left(\\left(z-\\frac{1}{4}\\right)^2+0.02\\right)",
          frontcolor: "#0000ff",
          backcolor: "#0000ff",
          alpha: 1
        });
      },
    },
    watch: {
      surfaces: updatesurfaces,
      backgroundcolor: (color) => cdy.evokeCS(`backgroundcolor = ${hex2ccolor(color)};`),
      lightcolor: (color) => cdy.evokeCS(`lightcolor = ${hex2ccolor(color)};`)
    }
  });
});
