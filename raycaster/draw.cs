//the following is executed for every rendered frame
if (dragging,
    dx = 3 * (sx - mouse().x); dy = 3 * (sy - mouse().y);,
    dx = .9*dx; dy = .9*dy;
);

sx = mouse().x;
sy = mouse().y;

//the rotation matrix: It is modified either if the user is dragging or time passes
mat = mat * (
    (1, 0, 0),
    (0, cos(dy), -sin(dy)),
    (0, sin(dy), cos(dy))
) * (
    (cos(dx), 0, -sin(dx)),
    (0, 1, 0),
    (sin(dx), 0, cos(dx))
);


//the 3 sliders at the left.
PA.x = 0.55;
if (PA.y > .4, PA.y = .4);
if (PA.y < -.4, PA.y = -.4);
a = smootha((.5 + PA.y/.7));

/*    PB.x = 0.6;
if (PB.y > .4, PB.y = .4);
if (PB.y < -.4, PB.y = -.4);
alpha = ((.4 + PB.y) / .8) * .7 + .3;*/

PC.x = 0.65;
if (PC.y > .4, PC.y = .4);
if (PC.y < -.4, PC.y = -.4);
zoom = exp(-3 * PC.y + 1);

//configuration for the lights in the scene. A light has a position, a gamma-parameter for its shininess and a color
lightdirs = [
    ray((.0, .0), -100), //enlights parts of the surface which normal points away from the camera
    ray((.0, .0), -100),
    //ray((.0, .0), 100), //Has an effect, if the normal of the surface points to the camera
    //ray((.0, .0), 100),
    //(-10, 10, -2.),
    (10, -8, 3.)
];
lightdirs = apply(lightdirs, l, l/|l|);

gamma = [1, 10, 4, 5];

  /*      
colors = [
    (.3, .5, 1.),
    (1, 2, 2) / 2,
    (1., 0.2, 0.1),
    (2, 2, 1) / 2,
    .9 * (.7, .8, .3),
    .9 * (.6, .1, .6)
];*/


//what color should be given to pixel with pixel-coordinate pixel (vec2)
if(min(alphas)<.99,
  raycast(pixel, l, u) := (
    regional(a, b);
    rd = raydir(pixel);
    //traverse binary tree (DFS) using heap-indices
    //1 is root node and node v has children 2*v and 2*v+1
    id = 1; 
    //maximum number of steps
    repeat(min(N*8,80),
      //id=0 means we are done; do only a DFS-step if we are not finished yet
      if(id>0,
        s = gets(id); //s = floor(log_2(id))
        
        //the intervals [a,b] are chossen such that (id in binary notation)
        //id = 1   => [a,b]=[l,u]
        //id = 10  => [a,b]=[l,(u+l)/2]
        //id = 101 => [a,b]=[l,(u+3*l)/4]
        //id = 11  => [a,b]=[(u+l)/2,u]
        //...
        a = u - (u-l)*((id+1)/s-1);
        b = u - (u-l)*((id+0)/s-1);
        
        //how many sign changes has F(ray(pixel, ·)) in (a,b)?
        cnt = nsign(pixel, a, b);
        if(cnt == 1 % (b-a)<1e-4, //in this case we found a root (or it is likely to have a multiple root)
          //=>colorize and break DFS
          bisectf(pixel, a, b);
          updatecolor();
          id = next(id),
        if(cnt == 0, //there is no root
          id = next(id), //break DFS
          
          //otherwise cnt>=2: there are cnt - 2*k roots.
          id = 2*id;  //visit first child within DFS
        )
    );  
    ));
  );,
  raycast(pixel, l, u) := (
    regional(a, b);
    rd = raydir(pixel);
    //traverse binary tree (DFS) using heap-indices
    //1 is root node and node v has children 2*v and 2*v+1
    id = 1; 
    //maximum number of steps
    intersect = false;
    repeat(min(N*7,50),
      //id=0 means we are done; do only a DFS-step if we are not finished yet
      if(!intersect & id>0,
        s = gets(id); //s = floor(log_2(id))
        
        //the intervals [a,b] are chossen such that (id in binary notation)
        //id = 1   => [a,b]=[l,u]
        //id = 10  => [a,b]=[l,(u+l)/2]
        //id = 101 => [a,b]=[l,(u+3*l)/4]
        //id = 11  => [a,b]=[(u+l)/2,u]
        //...
        a = l + (u-l)*((id+0)/s-1);
        b = l + (u-l)*((id+1)/s-1);
        
        //how many sign changes has F(ray(pixel, ·)) in (a,b)?
        cnt = nsign(pixel, a, b);
        if(cnt == 1 % (b-a)<1e-4, //in this case we found a root (or it is likely to have a multiple root)
          //=>colorize and break DFS
          intersect = true;
          id = next(id),
        if(cnt == 0, //there is no root
          id = next(id), //break DFS
          
          //otherwise cnt>=2: there are cnt - 2*k roots.
          id = 2*id;  //visit first child within DFS
        )
        );  
      );
    );
    if(intersect, bisectf(pixel, a, b); updatecolor());
  );
);
  


colorplot(
  spolyvalues = apply([-2, 0, 2], v, S(ray(#, v))); //evaluate S along ray
  spoly = B3 * spolyvalues;                         //interpolate to monomial basis
  D = (spoly_2 * spoly_2) - 4. * spoly_3 * spoly_1; //discriminant of spoly
  color = backgroundcolor; //the color, which will be returned
  if (D >= 0, //ray intersects ball
    raycast(
      #, 
      (-spoly_2 - re(sqrt(D))) / (2 * spoly_3), //intersection entering the ball
      (-spoly_2 + re(sqrt(D))) / (2 * spoly_3)//intersection leaving the ball
    );              
  );
  color //return value
); //render the scene. # is the pixel coordinate


//drawtext((-.65, -.45), "degree: $" + if(newN<100,newN,"\infty") +"$");

//lines for the sliders
draw((.55, .4), (.55, -.4), color -> (0, 0, 0));
//draw((.6, .4), (.6, -.4), color -> (0, 0, 0));
draw((.65, .4), (.65, -.4), color -> (0, 0, 0));   
