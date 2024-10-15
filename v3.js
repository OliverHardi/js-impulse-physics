const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;
ctx.imageSmoothEnabled = false;

//constants
const GRAVITY = 400;
const SUBSTEPS = 16;
const EASE_FACTOR = 0.2;
const CONTACT_EASE = 0.25;

let mouse = {x: 0, y: 0};
let ogmouse = {x: 0, y: 0};
let mouseDown = false;

document.addEventListener('mousedown', function (event) {
    mouse = {x: event.clientX, y: event.clientY};
    ogmouse = mouse;
    
    mouseDown = true;
});
document.addEventListener('mouseup', function () {
    mouseDown = false;
    if(ogmouse.y == mouse.y){ return; }
    objects.push(newNgon(ogmouse.x, ogmouse.y, 0, 0, polygon(Math.round(3+Math.abs(mouse.x-ogmouse.x)*0.01), Math.abs(mouse.y-ogmouse.y) ), 1, 0.3, 0.3));
    //drawNgon(ogmouse.x, ogmouse.y, polygon(Math.round(3+Math.abs(mouse.x-ogmouse.x)*0.01), Math.abs(mouse.y-ogmouse.y) ));
});
document.addEventListener('mousemove', function (event) {
    if (mouseDown) {
        mouse = {x: event.clientX, y: event.clientY};
    }
});



const m = {
    newMatrix: function(angle) {
        const cosTheta = Math.cos(angle);
        const sinTheta = Math.sin(angle);

        return [
            [cosTheta, -sinTheta],
            [sinTheta, cosTheta]
        ];
    },

    rotate: function(point, matrix) {
        const x = point[0];
        const y = point[1];

        const rx = matrix[0][0] * x + matrix[0][1] * y;
        const ry = matrix[1][0] * x + matrix[1][1] * y;

        return [rx, ry];
    }
};

function mod(n, m) {
    return ((n % m) + m) % m;
}

function COM(p){
    let com = [0, 0];
    let area = 0;
    for(let i = 0; i<p.length; i++){
        let p1 = p[i];
        let p2 = p[(i+1)%p.length];
        let a = p1[0]*p2[1] - p1[1]*p2[0];
        area += a;
        com[0] += (p1[0] + p2[0])*a;
        com[1] += (p1[1] + p2[1])*a;
    }
    area *= 0.5;
    return [[com[0]/(area*6), com[1]/(area*6)], area];
}

function polygon(sides, size){
    let p = []
    for(let i = 0; i < sides; i++){
        let d = ((i+0.5)/sides)*6.28318531;
        p.push([Math.cos(d)*size, Math.sin(d)*size]);
    }
    return p;
}

function rectangle(s1, s2){
    return [[-s1, -s2], [s1, -s2], [s1, s2], [-s1, s2]];
}

function newNgon(xpos, ypos, xvel, yvel, verts, m, restitution, frict){
    let data = COM(verts);
    let com = data[0];
    let area = data[1];
    //com = [0, 0];
    for(let i = 0; i < verts.length; i++){
        verts[i] = subtract(verts[i], com);
    }
    return{
        x: xpos,
        y: ypos,
        p: verts,
        xv: xvel,
        yv: yvel,
        rv: 0,
        fx: 0,
        fy: 0,
        fr: 0,
        tx: 0,
        ty: 0,
        mass: 1/(m),
        inertia: 2/(area*m),
        res: restitution,
        friction: frict,
        minx: 0,
        miny: 0,
        maxx: 0,
        maxy: 0
    }
}

function newManifold(a, b, minn, minv, con){
    return{
        a: a,
        b: b,
        minn: minn,
        minv: minv,
        contact: con
    }
}

function getExtent(a, b){
    let tx = a[0]-b[0];
    let ty = a[1]-b[1];
    let dist = Math.sqrt( tx*tx + ty*ty );
    return [ty/dist, 0-tx/dist];
}

function dot(a, b){
    return a[0]*b[0] + a[1]*b[1];
}

function dr(x, y){
    ctx.fillStyle = 'blue';
    ctx.fillRect(x-2, y-2, 4, 4);
}

function de(p){
    ctx.fillRect(p[0]-2, p[1]-2, 4, 4);
}

function getVert(o, v){
    let obj = objects[o];
    return [ obj.x + obj.p[v][0], obj.y + obj.p[v][1] ];
}

//min1 max1 min2 max2

function getSupport(o, n){
    let dist = -1/0;
    let vert;
    let obj = objects[o];
    for(let i = 0; i < obj.p.length; i++){
        let v = getVert(o, i);
        let t = dot(v, n);
        if(t > dist){
            dist = t;
            vert = v;
        }
    }
    return vert;
}

function findAxis(a, b){
    let mtv = -1/0;
    let index = 0;
    let normal;

    let obja = objects[a];
    let objb = objects[b];

    for(let i = 0; i < obja.p.length; i++){
        let v = getVert(a, i);
        let v2 = getVert(a, (i+1)%obja.p.length);
        let n = getExtent(v, v2);
        let support = getSupport(b, n);
        let t = dot( [-n[0]+0, -n[1]+0], [support[0]-v[0], support[1]-v[1]] );
        if(t > mtv){
            mtv = t;
            index = i;
            normal = [-n[0]+0, -n[1]+0];
        }

    }
    return [mtv, normal, index];
}

function clip(a, b1, b2){    
    let n = getExtent(b1, b2);
    let d1 = dot(n, [ a[0][0] - b1[0], a[0][1] - b1[1] ] );
    let d2 = dot(n, [ a[1][0] - b1[0], a[1][1] - b1[1] ] );
    
    if(d1*d2 < 0){
  
        let dir = [ a[0][0] - a[1][0], a[0][1] - a[1][1] ];
        let t = dot(n, dir);
        if(d1 > 0){
            t = d1/t;
            a[1] = [ a[0][0]-t*dir[0], a[0][1]-t*dir[1] ];
        }
        if(d2 > 0){
            t = d2/t;
            a[0] = [ a[1][0]-t*dir[0], a[1][1]-t*dir[1] ];
        }

    }

    return a;
}

function SAT(a, b){

    let reference, incident, mtv, flip;

    penetrationa = findAxis(a, b);
    if(penetrationa[0] >= 0){ return; }
    
    penetrationb = findAxis(b, a);
    if(penetrationb[0] >= 0){ return; }

    if(penetrationa[0] > penetrationb[0]){
        reference = a;
        incident = b;
        mtv = penetrationa;
        flip = 1;
    }else{
        reference = b;
        incident = a;
        mtv = penetrationb;
        mtv[1] = [-mtv[1][0], -mtv[1][1]];
        flip = -1;
    }
    let refEdge = mtv[2];
    let edge1 = [getVert(reference, mtv[2]), getVert(reference, (mtv[2]+1)%objects[reference].p.length)];

    let edge2 = [];
    let d = 1/0;
    for(let i = 0; i < objects[incident].p.length; i++){
        let v = getVert(incident, i);
        let t = flip*dot(mtv[1], v);
        if(t < d+CONTACT_EASE){
            if(Math.abs(t-d) < CONTACT_EASE){
                edge2.push(v);
            }else{
                edge2 = [v];
            }
            d = t;
        }
    }
    if(edge2.length == 2){
        edge2 = clip(edge2, getVert(reference, (refEdge+1)%objects[reference].p.length), getVert(reference, (refEdge+2)%objects[reference].p.length ));
        edge2 = clip(edge2, getVert(reference, mod(refEdge-1, objects[reference].p.length) ), getVert(reference, refEdge) );
    }
    

    manifolds.push(newManifold(a, b, mtv[1], mtv[0], edge2));
}



//manifold
/*
object a index
object b index
normal
penetration dist
edge 1
edge 2
*/

function drawNgon(x, y, p){
    //let mat = m.newMatrix(r);
    ctx.beginPath();
    let p1 = p[0];
    ctx.moveTo(x+p1[0], y+p1[1]);
    for(let i = 1; i < p.length; i++){
        //point = m.rotate(p[i], mat);
        point = p[i];
        ctx.lineTo(x+point[0], y+point[1]);
    }
    //ctx.fill();
    ctx.lineTo(x+p1[0], y+p1[1]);
    ctx.stroke();
    ctx.closePath();
}

function rotateNgon(i, r){
    let mat = m.newMatrix(r);
    for(let j = 0; j < objects[i].p.length; j++){
        objects[i].p[j] = m.rotate(objects[i].p[j], mat);
    }
}

function pyramid(base, size){
    let t = 0.70710678 * 2 * size + 0.1;
    for(let y = 0; y < base; y++){
        for(let x = 0; x < base-y; x++){
            objects.push(newNgon(100+(t+4)*(x+y*0.5), 740-t*y, 0, 0, polygon(4, size), 1, 0.15, 0.75))
        }
    }
    
}

function init(){
    objects.push(newNgon(1100, 120, 0, 0, polygon(24, 50), 20, 0.25, 0.5));
    //rotateNgon(objects.length-1, 1/3 * 6.28318531);
    //objects.push(newNgon(400, 400, 0, 0, [[0, 0], [50, 0], [50, 50], [0, 50]], Infinity, 0.3, 0.1));


    objects.push(newNgon(canvas.width/2, canvas.height, 0, 0, rectangle(canvas.width*0.5, 20), Infinity, 0.2, 0.7));
    objects.push(newNgon(0, canvas.height/2, 0, 0, rectangle(20, canvas.height/2), Infinity, 0.2, 0.2));
    //objects.push(newNgon(canvas.width, canvas.height/2, 0, 0, rectangle(20, canvas.height/2), Infinity, 0.2, 0.2));

    //rotateNgon(objects.length-1, 0.5 * 6.28318531);
    pyramid(18, 24);

    for(let i = 0; i < 0; i++){
        objects.push(newNgon(Math.random() * canvas.width, Math.random() * canvas.height - 300, 0, 0, polygon(Math.round(3+Math.random()*5), 5+Math.random()*10), 1, 0.2, 0.1));
        //objects.push(newNgon(Math.random() * canvas.width, Math.random() * canvas.height - 400, 0, 0, [ [-25, -25], [25, -25], [25, 25], [-25, 25] ], 1, 0.2, 0.3));
        rotateNgon(objects.length-1, Math.random() * 6.28318531);
    }

}

function setAABB(j){
    let minx = 1/0;
    let miny = 1/0;
    let maxx = -1/0;
    let maxy = -1/0;
    let px = objects[j].x;
    let py = objects[j].y;
    for(let i = 0; i < objects[j].p.length; i++){
        let p = objects[j].p[i];
        let x = p[0] + px;
        let y = p[1] + py;
        minx = Math.min(minx, x);
        miny = Math.min(miny, y);
        maxx = Math.max(maxx, x);
        maxy = Math.max(maxy, y);
    }
    objects[j].minx = minx;
    objects[j].miny = miny;
    objects[j].maxx = maxx;
    objects[j].maxy = maxy;
}

function AABB(a, b){
    if(a.maxx < b.minx || a.minx > b.maxx){
        return false;
    }
    if(a.maxy < b.miny || a.miny > b.maxy){
        return false;
    }
    return true
}

function applyForces(i){
    let obj = objects[i];

    objects[i].x += obj.xv*dt + objects[i].tx;
    objects[i].y += obj.yv*dt + objects[i].ty;
    rotateNgon(i, obj.rv*dt);

    objects[i].xv += obj.fx;
    objects[i].yv += obj.fy;
    objects[i].rv += obj.fr;

    objects[i].fx = 0;
    objects[i].fy = dt * GRAVITY * (objects[i].mass > 0);
    objects[i].fr = 0;

    objects[i].tx = 0;
    objects[i].ty = 0;
    
    if(objects[i].mass > 0 && false){
        if(objects[i].x < -50){ objects[i].x = canvas.width + 50; }
        if(objects[i].y < -50){ objects[i].y = canvas.height + 50; }
        if(objects[i].x > canvas.width + 50){ objects[i].x = -50; }
        if(objects[i].y > canvas.height + 50){ objects[i].y = -50; }
    }
}

function subtract(a, b){
    return [a[0]-b[0], a[1]-b[1]];
}
function mult(a, b){
    return [a[0]*b, a[1]*b];
}
function cross(a, b){
    return a[0]*b[1]-a[1]*b[0];
}
function normalize(a){
    let d = Math.sqrt(a[0]*a[0]+a[1]*a[1]);
    return [a[0]/d, a[1]/d];
}

function applyManifold(i){
    

    let manifold = manifolds[i];
    let a = manifold.a;
    let b = manifold.b;
    let c;
    if(manifold.contact.length == 2){
        c = [0.5*(manifold.contact[0][0]+manifold.contact[1][0]), 0.5*(manifold.contact[0][1]+manifold.contact[1][1])];
    }else{
        c = manifold.contact[0];
    }
  
    let ra = subtract(c, [objects[a].x, objects[a].y]);
    let rb = subtract(c, [objects[b].x, objects[b].y]);

    let rap = [-ra[1], ra[0]];
    let rbp = [-rb[1], rb[0]];

    let aa = mult(rap, objects[a].rv);
    let ab = mult(rbp, objects[b].rv);

    let rvx = (objects[b].xv+ab[0]) - (objects[a].xv+aa[0]);
    let rvy = (objects[b].yv+ab[1]) - (objects[a].yv+aa[1]);

    let sum = objects[a].mass + objects[b].mass;

    let cvm = (rvx*manifold.minn[0])+(rvy*manifold.minn[1])
    if( cvm > 0){
        
        objects[a].tx += manifold.minn[0] *  (objects[a].mass/sum) * manifold.minv * EASE_FACTOR;
        objects[a].ty += manifold.minn[1] *  (objects[a].mass/sum) * manifold.minv * EASE_FACTOR;
    
        objects[b].tx -= manifold.minn[0] * (objects[b].mass/sum) * manifold.minv * EASE_FACTOR;
        objects[b].ty -= manifold.minn[1] * (objects[b].mass/sum) * manifold.minv * EASE_FACTOR;
        
        return;
    }
    /*
    ctx.fillStyle = 'rgb(80, 90, 94)';
    de(manifold.contact[0]);
    if(manifold.contact.length == 2){
        de(manifold.contact[1]);
    }*/


    let rapd = dot(rap, manifold.minn);
    let rbpd = dot(rbp, manifold.minn);

    let j = -(1+Math.min(objects[a].res, objects[b].res));
    let j2 = cvm;
    let j3 = sum + (rapd*rapd)*objects[a].inertia + (rbpd*rbpd)*objects[b].inertia;
    j = (j*j2)/j3;

    objects[a].fx -= objects[a].mass * j * manifold.minn[0];
    objects[a].fy -= objects[a].mass * j * manifold.minn[1];
    objects[a].fr -= objects[a].inertia * cross(ra, mult(manifold.minn, j));

    objects[b].fx += objects[b].mass * j * manifold.minn[0];
    objects[b].fy += objects[b].mass * j * manifold.minn[1];
    objects[b].fr += objects[b].inertia * cross(rb, mult(manifold.minn, j));

    objects[a].tx += manifold.minn[0] *  (objects[a].mass/sum) * manifold.minv * EASE_FACTOR;
    objects[a].ty += manifold.minn[1] *  (objects[a].mass/sum) * manifold.minv * EASE_FACTOR;

    objects[b].tx -= manifold.minn[0] * (objects[b].mass/sum) * manifold.minv * EASE_FACTOR;
    objects[b].ty -= manifold.minn[1] * (objects[b].mass/sum) * manifold.minv * EASE_FACTOR;
    
    let tangent = subtract([rvx, rvy], mult(manifold.minn, cvm));

    if(Math.abs(tangent[0]) < CONTACT_EASE && Math.abs(tangent[1]) < CONTACT_EASE){
        return;
    }else{
        tangent = normalize(tangent);
    }

    let rapt = dot(rap, tangent);
    let rbpt = dot(rbp, tangent);


    let jt = -dot([rvx, rvy], tangent);
    jt /= sum + (rapt*rapt)*objects[a].inertia + (rbpt*rbpt)*objects[b].inertia;

    let sf = (objects[a].friction + objects[b].friction)*0.5;
    let df = (objects[a].friction + objects[b].friction)*0.5;


    let fj;
    
    if(Math.abs(jt) <= j){
        fj = mult(tangent, jt*sf);
    }else{
        fj = mult(tangent, jt*df);
    }
    
    objects[a].fx -= objects[a].mass * fj[0];
    objects[a].fy -= objects[a].mass * fj[1];
    objects[a].fr -= objects[a].inertia * cross(ra, fj);

    objects[b].fx += objects[b].mass * fj[0];
    objects[b].fy += objects[b].mass * fj[1];
    objects[b].fr += objects[b].inertia * cross(rb, fj);

}

function update(){
    for(let i = 0; i < objects.length; i++){
        applyForces(i);
        setAABB(i);
    }

    manifolds = [];
    for(let i = 0; i < objects.length; i++){
        for(let j = i; j < objects.length; j++){
            if(i == j){ continue; }
            if(objects[i].mass == 0 && objects[j].mass == 0){ continue; }
            if(!AABB(objects[i], objects[j])){ continue; }
            SAT(i, j);
        }
    }
    
    for(let i = 0; i < manifolds.length; i++){
        applyManifold(i);
    }

    objects[0].fx += dt*1000*(arrowKeys[3]-arrowKeys[2]);
    objects[0].fy += dt*1000*(arrowKeys[1]-arrowKeys[0]);
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();       // Start a new path
    ctx.moveTo(x1, y1);    // Move to the start point
    ctx.lineTo(x2, y2);    // Draw a line to the end point
    ctx.stroke();          // Render the line
}

function draw(){
    for(let i = 0; i < objects.length; i++){
        let obj = objects[i];
        //ctx.strokeStyle = 'rgb(200, 200, 200)';
        //ctx.strokeRect(obj.minx, obj.miny, obj.maxx-obj.minx, obj.maxy-obj.miny);
        
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        drawNgon(obj.x, obj.y, obj.p);
        
        ctx.strokeStyle = 'rgb(200, 200, 200)';

        drawLine(obj.x, obj.y, obj.x+0.667*obj.p[0][0], obj.y+0.667*obj.p[0][1]);
        
    }
}

let arrowKeys = [0, 0, 0, 0];
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'ArrowUp':
            arrowKeys[0] = 1;
            break;
        case 'ArrowDown':
            arrowKeys[1] = 1;
            break;
        case 'ArrowLeft':
            arrowKeys[2] = 1;
            break;
        case 'ArrowRight':
            arrowKeys[3] = 1;
            break;
    }
});
document.addEventListener('keyup', function(event) {
    switch(event.key) {
        case 'ArrowUp':
            arrowKeys[0] = 0;
            break;
        case 'ArrowDown':
            arrowKeys[1] = 0;
            break;
        case 'ArrowLeft':
            arrowKeys[2] = 0;
            break;
        case 'ArrowRight':
            arrowKeys[3] = 0;
            break;
    }

});

function objectAdding(){
    if(mouseDown){
        drawNgon(ogmouse.x, ogmouse.y, polygon(Math.round(3+Math.abs(mouse.x-ogmouse.x)*0.01), Math.abs(mouse.y-ogmouse.y) ));
    }
}

let lastTime = 0;
let dt = 0;

let objects = [];
let manifolds = [];
let frame = 0;
init();

let temp = 1;
function step(timestamp){
    dt = (timestamp - lastTime) / 1000;
    if(isNaN(dt)){ dt = 0; }
    dt = Math.min(dt, 0.1);
    let fps = 1 / dt;
    dt /= SUBSTEPS;

    lastTime = timestamp;

    //console.clear()
    ctx.clearRect(0,0,canvas.width, canvas.height);
    //console.log(dt);
    for(let i = 0; i < SUBSTEPS; i++){
        update();
    }
    
    draw();    
    objectAdding();
    ctx.fillText(Math.round(fps*10)/10, 0, 8)

    frame++;
    //rotateNgon(0, 0.01);
    if(temp){requestAnimationFrame(step);}
}
step();
