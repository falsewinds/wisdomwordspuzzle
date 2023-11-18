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
const separaters = {
    "zh": "",
    "en": " "
};
let container = null, correct_answer, separater;
function initialize(e,lang) {
    container = get_or_create_element(e);
    if (lang in separaters) { separater = separaters[lang]; }
    else { separater = separaters["zh"]; }
}

function play(puzz) {
    if (container==null) { return; }
    container.innerHTML = "";
    container.classList.remove("correct");
    container.removeEventListener("mousemove",ondragging);
    container.removeEventListener("mouseup",ondragend);
    if (puzz==null) { return; }

    // check puzz
    let row_count = 1;
    correct_answer = puzz.sentence;
    let sentences = [puzz.sentence];
    if (correct_answer instanceof Array) {
        correct_answer = puzz.sentence.join("");
        row_count = puzz.sentence.length;
        sentences = puzz.sentence;
    }
    if (typeof correct_answer != "string") {
        console.log(correct_answer);
        throw "Error: puzzle.sentence should be string.";
        return;
    }
    if (!(puzz.grouping instanceof Array)) {
        console.log(puzz.grouping);
        throw "Error: puzzle.grouping should be Array.";
        return;
    }

    // format sentence into puzzle rows
    if ("language" in puzz && puzz.language in separaters) {
        separater = separaters[puzz.language];
        console.log("change language to "+puzz.language);
    }
    const byword = ("separate" in puzz) ? (puzz.separate!="by_group") : true;
    let puzzle = create_element("div.puzzle"),
        groups = puzz.grouping,
        max_length = 0, max_grps = 0;
    container.appendChild(puzzle);
    container.addEventListener("mousemove",ondragging);
    container.addEventListener("mouseup",ondragend);
    for(let i=0;i<row_count;i++) {
        let row = create_element("div.row"), grps = 0,
            words = sentences[i].split(separater);
        if (words.length>max_length) { max_length = words.length; }
        while (words.length>0) {
            let group_words = groups.shift(),
                group = create_element("div.group"),
                term = [], spaces = [];
            for(let j=0;j<group_words;j++) {
                term.push(words.shift());
                spaces.push(create_element("div.space"))
            }
            spaces.forEach((sp)=>{ group.appendChild(sp); });
            row.appendChild(group);
            if (byword) {
                spaces.forEach((sp)=>{
                    sp.addEventListener("mouseover",ondropover);
                    sp.addEventListener("mouseout",ondropout);
                });
                term.forEach(create_answer);
            } else {
                group.addEventListener("mouseover",ondropover);
                group.addEventListener("mouseout",ondropout);
                create_answer(term.join(separater));
            }
            grps++;
        }
        if (grps>max_grps) { max_grps = grps; }
        puzzle.appendChild(row);
    }
    if (groups.length>0) {
        console.log(puzz,groups);
        throw "Error: grouping does not match with sentence.";
        return;
    }

    // calculate size
    let r = document.querySelector(":root"),
        rs = getComputedStyle(r),
        size = parseFloat(rs.getPropertyValue("--size")),
        gap = parseFloat(rs.getPropertyValue("--gap")),
        w = container.offsetWidth, h = container.offsetHeight,
        width = max_length * (size+gap*2) + max_grps*(gap*4);
    let downgrade = v=>v-1;//v=>v/2;
    if (width>w) {
        while (width>w) {
            gap = downgrade(gap);
            size = gap * 32;
            if (gap==1) { break; }
            width = max_length*(size+gap*2) + max_grps*(gap*4);
        }
        r.style.setProperty("--size",size+"px");
        r.style.setProperty("--gap",gap+"px");
        console.log("new size:"+size+"px, gap: "+gap+"px.");
    }
    // Centerize Puzzle Area
    let pw = puzzle.offsetWidth, ph = puzzle.offsetHeight,
        x = (w-pw) / 2, y = (h-ph) / 2;
    puzzle.style.margin = y+"px "+x+"px";

    // Randomize Answer
    let terms = container.querySelectorAll(".word");
    let ww = w - size, wh = h - size*2 - ph,
        rng = ww / terms.length, py = y - size,
        wxs = new Array(terms.length).fill(0)
            .map((w,i)=>{ return i*rng; })
            .sort(()=>Math.random()-0.5);
    terms.forEach((term)=>{
        let w = term.word,
            wx = wxs.shift() + Math.random() * (rng-w.length*size),
            wy = Math.random() * wh;
        if (wy>=py) { wy += (ph+size); }
        term.style.left = wx + "px";
        term.style.top = wy + "px";
        if (w.length>1) {
            term.style.width = "calc(var(--size) * "+w.length+")";
        }
    });

    if ("filled" in puzz && puzz.filled instanceof Array) {
        let fields = container.querySelectorAll(byword?".space":".group"),
            max = Math.min(fields.length,terms.length,puzz.filled.length);
        for(let i=0;i<max;i++) {
            if (!puzz.filled[i]) { continue; }
            fill_answer(fields[i],terms[i].word);
            terms[i].remove();
        }
    }
};

function create_answer(answer) {
    let word = create_element("div.word");
    word.word = answer;
    word.textContent = answer;
    word.addEventListener("mousedown",ondragstart);
    container.appendChild(word);
}

function clear_answer(space) {
    if (space.classList.contains("group")) {
        let spaces = space.querySelectorAll(".space");
        for(let i=0;i<spaces.length;i++) { clear_answer(spaces[i]); }
        return;
    }
    space.removeAttribute("wwp-answer");
    space.textContent = "";
};
function fill_answer(space,answer) {
    if (space.classList.contains("group")) {
        let answers = answer.split(separater),
            spaces = space.querySelectorAll(".space");
        for(let i=0;i<spaces.length;i++) {
            fill_answer(spaces[i],answers[i]);
        }
        return;
    }
    space.setAttribute("wwp-answer",answer);
    space.textContent = answer;
};

function dropped(drag,drop) {
    container.classList.remove("wrong");
    if (drag.in!=null && drag.in!=drop) {
        clear_answer(drag.in);
    }
    drag.in = drop;
    if (drop==null) {
        drag.classList.remove("invisible");
        return;
    }
    if (drop.classList.contains("group")) {
        let drop_words = drop.querySelectorAll(".space").length;
        if (drag.word.length!=drop_words) {
            drag.in = null;
            drag.classList.remove("invisible");
            return;
        }
    }
    fill_answer(drop,drag.word);
    drag.classList.add("invisible");

    // check if all space is full
    let empty = container.querySelectorAll(".space:not(*[wwp-answer])");
    if (empty.length<=0) {
        let words = container.querySelectorAll(".space"),
            answer = [];
        for(let i=0;i<words.length;i++) {
            answer.push(words[i].getAttribute("wwp-answer"));
        }
        answer = answer.join(separater);
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