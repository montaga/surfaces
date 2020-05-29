speciala = .5;
smootha(x) := if(x<speciala,
  (-1/(speciala+.01))*(x-speciala)^2+speciala,
  (1/(1.01-speciala))*(x-speciala)^2+speciala      
);

seta(na) := (
  a = na;
  speciala = na;
  PA.y = (na-.5)*.7;
);

setzoom(zoom) := (
  PC.y = (zoom);
);

//initialize some variables
mat = [
    [0.3513, 0.4908, -0.7973],
    [-0.8171, 0.5765, -0.0051],
    [-0.4571, -0.6533, -0.6036]
];
sx = mouse().x;
sy = mouse().y;
dragging = false;
N = 5;
zoom = 2.2;
a = 0.3;
//alpha = .7;

//we stand at position mat*(0, 0, -2.2) and watch to (0,0,0).
//ray(pixel, t) is the point in R^3 that lies at position t the ray behind the pixel at location pixel(vec2)
//t=0 is corresponds to points within the interesting area near (0,0,0)
ray(pixel, t) := mat * ((t+2.2) * (pixel.x, pixel.y, 1) + (0, 0, -2.2));
raydir(pixel) := (v = mat * (pixel.x, pixel.y, 1); v/|v|);
//sphere with radius 1 for clipping
S(r) := (r * r - 1);

//fun is the user defined trivariate polynomial

fun0(x, y, z) := (x ^ 2 + y ^ 2 + z ^ 2 - (0.5 + a) ^ 2) ^ 2 - (3.0 * ((0.5 + a) ^ 2) - 1.0) / (3.0 - ((0.5 + a) ^ 2)) * (1 - z - sqrt(2) * x) * (1 - z + sqrt(2) * x) * (1 + z + sqrt(2) * y) * (1 + z - sqrt(2) * y);


frontcolors = [[0.3176470588235294, 0.396078431372549, 0.5803921568627451]];
backcolors = [[0.9215686274509803, 0.5372549019607843, 0]];
alphas = [.99];
Nsurf = 1;

//F takes vec3 instead of 3 variables
F(p) := (p=p/zoom;[fun0(p.x, p.y, p.z)]);
    
//casteljau algorithm to evaluate and subdivide polynomials in Bernstein form.
//poly is a vector containing the coefficients, i.e. p(x) = sum(0..N, i, poly_(i+1) * b_(i,N)(x)) where b_(i,N)(x) = choose(N, i)*x^i*(1-x)^(N-1)
casteljau(poly, x) := (
  regional(alpha, beta);
  alpha = 1-x;
  beta = x;
  forall(0..N, k,
    repeat(N-k,
      poly_# = alpha*poly_# + beta*poly_(#+1);
    );
  );
  poly //the bernstein-coefficients of the polynomial in the interval [x,1]
);

//evaluates a polynomial, represented as vector of coefficients in bernstein-form
eval(poly, x) := casteljau(poly, x)_1;

//this function has to be called whenever fun changes
init() := (
  dx = .05; dy =.02;
  diff(fun0(x,y,z), x, dxfun0(x,y,z) := #);
  diff(fun0(x,y,z), y, dyfun0(x,y,z) := #);
  diff(fun0(x,y,z), z, dzfun0(x,y,z) := #);
  

  //The following line is DIRTY, but it makes the application run smooth for high degrees. :-)
  //Nethertheless, it might cause render errors for high degree surfaces. In fact, only a subset of the surface is rendered.
  //Adapt limit according to hardware.
  //values of kind 4*n-1 are good values, as it means to use vectors of length 4*n.
  N = 7; 
  
  //N+1 Chebyshev nodes for interval (0, 1)
  li = apply(1..(N+1), k, (cos((2 * k - 1) / (2 * (N+1)) * pi)+1)/2);
  
  //A is the matrix of the linear map that evaluates a polynomial in bernstein-form at the Chebyshev nodes
  A = apply(li, node,
    //the i-th column contains the values of the (i,N) bernstein polynomial evaluated at the Chebyshev nodes
    apply(0..N, i, eval(
      apply(0..N, if(#==i,1,0)), // e_i = [0,0,0,1,0,0]
      node //evaluate  b_(i,N)(node)
    )) 
  );
  
  B = (inverse(A)); //B interpolates polynomials (in Bernstein basis), given the values [p(li_1), p(li_2), ...]

    
);
init();

//B3 is a matrix that interpolates quadratic polynomials (in monomial basis), given the values [p(-2), p(0), p(2)]
B3 = inverse(apply([-2, 0, 2], c, apply(0 .. 2, i, c ^ i))); 

//use symbolic differentation function
dF(p) := (p=p/zoom; [[
    dxfun0(p.x,p.y,p.z),
    dyfun0(p.x,p.y,p.z),
    dzfun0(p.x,p.y,p.z)
]]
);

componentwise(a, b):= (a_1*b_1, a_2*b_2, a_3*b_3);

//update the color color for the pixel at position pixel assuming that the surface has been intersected at ray(pixel, dst)
//because of the alpha-transparency updatecolor should be called for the intersections with large dst first
updatecolor(pixel, dst, color) := (
  regional(x, normal, Fvec, dFvec, fval, nval, frontcolor, backcolor, alpha);
  rd = raydir(pixel);
  
  x = ray(pixel, dst); //the intersection point in R^3
  Fvec = F(x);
  dFvec = dF(x);
  
  normal = dFvec_1;
  fval = |Fvec_1|/|dFvec_1|;
  frontcolor = frontcolors_1;
  backcolor = backcolors_1;
  alpha = alphas_1;
  forall(1..Nsurf, pid,
    nval = |Fvec_pid|/|dFvec_pid|;
    if(nval<fval,
      fval = nval;
      normal = dFvec_pid; //todo update surfcolor
      frontcolor = frontcolors_pid;
      backcolor = backcolors_pid;
      alpha = alphas_pid;
    );
  );
  /*
  normal = [0,0,0];
  surfcolor = [0,0,0];
  acc = 0;
  forall(1..Nsurf, pid,
    nval = max(0,1-10*|Fvec_pid|);
    normal = normal + nval*dFvec_pid;
    surfcolor = surfcolor + nval*surfcolors_pid;
    acc = acc+nval;
  );
  //normal = normal / acc;
  surfcolor = surfcolor / acc;*/
  //if(fval<10,
    color = (1 - alpha) * color;
    normal = normal / abs(normal);

    forall(1..length(lightdirs),
      //illuminate if the normal and lightdir point in the same direction
      illumination = abs((lightdirs_#) * normal);
      color = color + alpha * .7 * (illumination ^ gamma_#) * (if(rd*normal<0, frontcolor, backcolor) + [.05,.05,.05]);
    );
    color = color + alpha * .3 * if(rd*normal<0, frontcolor, backcolor); //ambient light
  //);
  
  color
);


nsign(poly) := (//count the number of sign changes in array
  regional(ans);
  ans = 0;
  forall(2..(N+1), k,
    //if(last == 0, last = poly_k;); this (almost) never happens
    if(min(poly_(k-1), poly_k) <= 0 & 0 <= max(poly_(k-1), poly_k), //sign switch; avoid products due numerics
      ans = ans + 1;
    );
  );
  ans
);

nsign(pixel, a, b) := ( //Descartes rule of sign for the interval (a,b) (together for all polynomials)
  regional(ans);
  //obtain the coefficients in bernstein basis of F along the ray in interval (a,b) by interpolation within this interval
  ans = 0;
  forall(1..Nsurf, pid,
    ans = ans + nsign(B * apply(li,
      F(ray(pixel, a+#*(b-a)))_pid //evaluate F(ray(pixel, ·)) along Chebyshev nodes for (a,b)
    ));
  );
  ans //return value   
);


//bisect F(ray(pixel, ·)) in [x0, x1] assuming that F(ray(pixel, x0)) and F(ray(pixel, x1)) have opposite signs
bisectf(pixel, x0, x1) := (
    regional(v0, v1, m, vm);
    m = 0;
    forall(1..Nsurf, pid,
      v0 = F(ray(pixel, x0))_pid;
      v1 = F(ray(pixel, x1))_pid;
      if(min(v0,v1)<= 0 & 0<=max(v0,v1),
        repeat(11,
          m = (x0 + x1) / 2; vm = F(ray(pixel, m))_pid;
          if (min(v0,vm) <= 0 & 0 <= max(v0, vm), //sgn(v0)!=sgn(vm); avoid products due numerics
              (x1 = m; v1 = vm;),
              (x0 = m; v0 = vm;)
          );
        );
      );
    );
    m //return value   
);


//id encodes a node in a binary tree using heap-indices
//1 is root node and node v has children 2*v and 2*v+1
//computes s=2^depth of a node id: Compute floor(log_2(id));
//purpose: id corresponds interval [id-s,id+1-s]/s
gets(id) := (
  s = 1;
  repeat(15,
    if(2*s<=id,
      s = 2*s;
    )
  );
  s //return value
);

//determines the next node in the binary tree that would be visited by a regular in DFS
//if the children of id are not supposed to be visited
//In interval logic: finds the biggest unvisited interval directly right of the interval of id.
next(id) := (
  id = id+1;
  //now: remove zeros from right (in binary representation) while(id&1) id=id>>1;
  repeat(15,
    if(mod(id,2)==0, 
      id = floor(id/2);
    )
  );
  if(id==1, 0, id) //return value - id 0 means we stop our DFS
);