(function() {

const css_pat = /^(.*?)(?:#(.*?))?(?:\.(.*?))?$/;
function create_element(selector) {
    let m = selector.match(css_pat),
        e = document.createElement(m[1] || "div");
    if (m[2]) { e.id = m[2]; }
    if (m[3]) { e.className = m[3]; }
    return e;
};
function get_or_create_element(elem) {
    if (elem instanceof HTMLElement) { return elem; }
    let e = document.querySelector(elem);
    if (e instanceof HTMLElement) { return e; }
    e = create_element(elem);
    document.body.appendChild(e);
    return e;
};

/*------------------------------------------------------------*\
 * Drag & Drop
\*------------------------------------------------------------*/
let dragging = null, dropping = null,
    last_x, last_y, elem_x, elem_y;
function ondragstart(e) {
    if (dragging!=null) { return; }
    dragging = this;
    dragging.classList.add("untouchable");
    elem_x = this.offsetLeft;
    elem_y = this.offsetTop;
    last_x = e.clientX;
    last_y = e.clientY;
};
function ondragging(e) {
    if (dragging==null) { return; }
    let dx = e.clientX - last_x,
        dy = e.clientY - last_y;
    elem_x += dx;
    elem_y += dy;
    last_x = e.clientX;
    last_y = e.clientY;
    dragging.style.left = elem_x + "px";
    dragging.style.top = elem_y + "px";
};
function ondragend(e) {
    if (dragging==null) { return; }
    let dx = e.clientX - last_x,
        dy = e.clientY - last_y;
    elem_x += dx;
    elem_y += dy;
    last_x = e.clientX;
    last_y = e.clientY;
    dragging.style.left = elem_x + "px";
    dragging.style.top = elem_y + "px";
    dragging.classList.remove("untouchable");
    dropped(dragging,dropping);
    dragging = null;
};
function ondropover(e) { dropping = this; };
function ondropout(e) { if (dropping==this) { dropping = null; } }

/*------------------------------------------------------------*\
 * Wisdom Words Puzzle (wwp)
\*------------------------------------------------------------*/
let container = null, correct_answer;
function initialize(e) { container = get_or_create_element(e); }
function play(puzz) {
    if (container==null) { return; }
    container.innerHTML = "";
    container.classList.remove("correct");

    let separater = function(s) { return s.split(""); };
    if (puzz==null) {
        // select puzzle from db...
    }
    // check puzz
    if (typeof puzz.sentence != "string") {
        console.log(puzz.sentence);
        throw "Error: puzzle.sentence should be string.";
        return;
    }
    if (!(puzz.grouping instanceof Array)) {
        console.log(puzz.grouping);
        throw "Error: puzzle.grouping should be Array.";
        return;
    }
    let words = separater(puzz.sentence),
        s_length = words.length,
        s_left = puzz.grouping.reduce((s,it)=>{
            s -= it;
            return s;
        },s_length);
    if (s_left!=0) {
        console.log(puzz,s_length,s_left);
        throw "Error: grouping is not match sentence.";
        return;
    }
    correct_answer = puzz.sentence;

    // calculate size
    let r = document.querySelector(":root"),
        rs = getComputedStyle(r),
        size = parseFloat(rs.getPropertyValue("--size")),
        border = parseFloat(rs.getPropertyValue("--border")),
        w = container.offsetWidth, h = container.offsetHeight,
        width = s_length * (size+border*2)
            + puzz.grouping.length * (border*2)
            + (border*2);
    if (width>w)
    {
        while (width>w) {
            size /= 2;
            border /= 2;
            width = s_length * (size+border*2)
                + puzz.grouping.length * (border*2)
                + (border*2);
        }
        r.style.setProperty("--size",size+"px");
        r.style.setProperty("--border",border+"px");
        console.log("new size:"+size+"px, border: "+border+"px.");
    }

    // create Puzzle Space
    let puzzle = create_element("div.puzzle");
    puzz.grouping.forEach((it)=>{
        let grp = create_element("div.group");
        for(let i=0;i<it;i++) {
            let sp = create_element("div.space");
            grp.appendChild(sp);
            sp.addEventListener("mouseover",ondropover);
            sp.addEventListener("mouseout",ondropout);
        }
        puzzle.appendChild(grp);
    });
    container.appendChild(puzzle);

    let pw = puzzle.offsetWidth, ph = puzzle.offsetHeight,
        x = (w-pw) / 2, y = (h-ph) / 2;
    puzzle.style.margin = y+"px "+x+"px";

    // create Puzzle Pieces
    container.addEventListener("mousemove",ondragging);
    container.addEventListener("mouseup",ondragend);
    let ww = w - size, wh = h - size*2 - ph,
        rng = ww / s_length, py = y - size,
        wxs = words.map((w,i)=>{
            return i*rng + Math.random()*(rng-size/2);
        }).sort(()=>Math.random()-0.5);
    words.forEach((w)=>{
        let word = create_element("div.word"),
            text = document.createTextNode(w),
            wx = wxs.shift(),
            wy = Math.random() * wh;
        if (wy>=py) { wy += (ph+size); }
        word.appendChild(text);
        word.word = w;
        word.style.left = wx + "px";
        word.style.top = wy + "px";
        container.appendChild(word);
        // assign event
        word.addEventListener("mousedown",ondragstart);
    });
};

function dropped(drag,drop) {
    container.classList.remove("wrong");
    if (drag.in!=null && drag.in!=drop) {
        drag.in.removeAttribute("wwp-answer");
        drag.in.textContent = "";
    }
    drag.in = drop;
    if (drop==null) {
        drag.classList.remove("invisible");
        return;
    }
    drop.setAttribute("wwp-answer",drag.word);
    drop.textContent = drag.word;
    drag.classList.add("invisible");

    // check if all space is full
    let empty = container.querySelectorAll(".space:not(*[wwp-answer])");
    if (empty.length<=0) {
        let words = container.querySelectorAll(".space"),
            answer = [];
        for(let i=0;i<words.length;i++) {
            answer.push(words[i].getAttribute("wwp-answer"));
        }
        answer = answer.join("");
        if (correct_answer!=answer) {
            container.classList.add("wrong");
        } else {
            container.classList.remove("wrong");
            container.classList.add("correct");
            container.removeEventListener("mousemove",ondragging);
            container.removeEventListener("mouseup",ondragend);
            let drags = container.querySelectorAll(".word");
            for(let i=0;i<drags.length;i++) {
                drags[i].remove();
            }
        }
    }
};

/*------------------------------------------------------------*\
 * Export
\*------------------------------------------------------------*/
window.wwp = {
    "init": initialize,
    "play": play
};

})();