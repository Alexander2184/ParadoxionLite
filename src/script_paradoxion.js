const body = document.querySelector("body");
const board = document.getElementById("board");
const inventory = document.getElementById("inventory");
const level = document.getElementById("level");
const rules = document.getElementById("rules-container");
const mainMenu = document.getElementById("main-menu");
const levelSelect = document.getElementById("level-select");
const levelsContainer = document.getElementById("levels-container");

const cell_size = 100;

function clearBoard() {
    board.innerHTML = "";
    inventory.innerHTML = "";
}

let levels = [];

fetch("levels.json")
    .then(response => response.json())
    .then(data => {
        levels = data;
        generateLevelButtons();
    })
    .catch(err => console.error("Failed to load levels:", err));

document.getElementById("btn-play").addEventListener("click", () => {
    switchScreen(levelSelect);
});

document.getElementById("btn-back-from-select").addEventListener("click", () => {
    switchScreen(mainMenu);
});

document.getElementById("btn-rules").addEventListener("click", () => {
    switchScreen(rules);
});


document.getElementById("btn-undo").addEventListener("click", () => {
    undo();
});

document.getElementById("btn-back-to-select").addEventListener("click", () => {
    clearBoard();
    switchScreen(levelSelect);
});

document.getElementById("btn-back-to-menu").addEventListener("click", () => {
    clearBoard();
    switchScreen(mainMenu);
});

document.getElementById("btn-rules-to-select").addEventListener("click", () => {
    clearBoard();
    switchScreen(levelSelect);
});

document.getElementById("btn-rules-to-menu").addEventListener("click", () => {
    clearBoard();
    switchScreen(mainMenu);
});

function generateLevelButtons() {
    levelsContainer.innerHTML = "";

    levels.forEach((lvl, index) => {

        const btn = document.createElement("button");
        btn.textContent = "Level " + (index + 1);

        btn.addEventListener("click", () => {
            startLevel(index);
        });

        levelsContainer.appendChild(btn);
    });
}

generateLevelButtons();

function switchScreen(screen) {
    mainMenu.classList.add("hidden");
    levelSelect.classList.add("hidden");
    level.classList.add("hidden");
    rules.classList.add("hidden");

    screen.classList.remove("hidden");
}


function createEmptyBoard(width, height) {
    for (let i = 0; i < width; i++) {
        const row = document.createElement("div");
        row.classList.add("row");
        for (let j = 0; j < height; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.i = i;
            cell.dataset.j = j;

            row.appendChild(cell);
        }
        row.style.setProperty("--grid-columns", height)
        board.appendChild(row);
    }
    board.width = width;
    board.height = height;

    board.moved = [];
    board.pushes = [];
    board.erase = [];

    board.style.setProperty("--grid-rows", width)
}

function createBoardFromTemplate(template, createStack) {
    createEmptyBoard(template.width, template.height);
    for (let i = 0; i < template.board_items.length; i++) {
        addItem(template.board_items[i], false)
    }
    if (createStack) {
        let reqWidth = template.width * 100 + 550;
        level.style.setProperty("min-width", reqWidth + "px")
        level.width = template.width;
        level.undoStack = [];
        level.undoStack.push(template);
    }
}

function createInventoryFromTemplate(template) {
    inventory.style.setProperty("--items-rows", template.inventory.length)
    for (let i = 0; i < template.inventory.length; i++) {
        addInventoryItem(template.inventory[i], i)
    }
}

function addItem(item, run) {

    const elem = document.createElement("div");
    elem.classList.add("item", item.type);
    elem.dataset.type = item.type;
    elem.dataset.row = item.row;
    elem.dataset.col = item.col;

    const cell = board.childNodes[item.row].childNodes[item.col];
    cell.appendChild(elem);

    elem.style.opacity = "0";
    elem.style.transform = "scale(0.5)";

    setTimeout(() => {
        elem.style.transition = "all 0.3s";
        elem.style.opacity = "1";
        elem.style.transform = "scale(1)";
    }, 10);

    if (run) {
        board.moved.push(item);
        runBoard();
    }
}

function removeItem(i, j) {
    const cell = board.childNodes[i].childNodes[j];
    if (cell.childNodes.length > 0) {
        const piece = cell.childNodes[0];
        erasePiece(board, cell, piece);
    }
}

function addInventoryItem(item) {
    const invItem = document.createElement("div");
    invItem.classList.add("inv-item");
    inventory.appendChild(invItem);


    const cell = document.createElement("div");
    cell.classList.add("cell");
    inventory.appendChild(cell);
    invItem.append(cell);
    invItem.dataset.amount = item.amount;

    const elem = document.createElement("div");
    elem.classList.add("item", item.type);
    elem.dataset.type = item.type;
    cell.appendChild(elem);

    const amount = document.createElement("div");
    amount.classList.add("inv-amount");
    amount.textContent = item.amount
    invItem.appendChild(amount);
}

function checkWin() {
    let win = true;
    for (let i = 0; i < board.width; i++) {
        for (let j = 0; j < board.height; j++) {
            if (board.childNodes[i].childNodes[j].childNodes.length > 0) {
                win = false;
            }
        }
    }
    if (win) {
        level.dataset.state = "win";
        createWinScreen("You win!");
    } else if (inventory.childNodes.length === 0) {
        level.dataset.state = "lose";
        createLoseScreen("You lose. Try again?");
    }
}

function exportBoard(writeConsole) {
    const levelData = {
        width: board.width,
        height: board.height,
        board_items: [],
        inventory: []
    };

    for (let i = 0; i < board.width; i++) {
        for (let j = 0; j < board.height; j++) {
            const cell = board.childNodes[i].childNodes[j];

            if (cell.childNodes.length > 0) {
                const item = cell.childNodes[0];
                levelData.board_items.push({
                    row: i,
                    col: j,
                    type: item.dataset.type
                });
            }
        }
    }

    for (let i = 0; i < inventory.childNodes.length; i++) {
        const invItem = inventory.childNodes[i];
        const type = invItem.querySelector(".item").dataset.type;
        const amount = parseInt(invItem.dataset.amount);

        levelData.inventory.push({
            type: type,
            amount: amount
        });
    }

    if (writeConsole) {
        console.log("Exported level:");
        console.log(JSON.stringify(levelData, null, 4));
    }

    return levelData;
}

function checkOverflow(i, j) {
    return i >= 0 && j >= 0 && i < board.width && j < board.height;
}

function possibleMove(board, i, j) {
    if (!checkOverflow(i, j)) {
        return false;
    }
    const cell = board.childNodes[i].childNodes[j];
    return cell.childNodes.length === 0;
}

function createMessage(text, e) {
    console.log("Error: " + text);
    const popup = document.createElement("div");
    popup.classList.add("popup");
    popup.style.left = e.clientX + 10 + 'px';
    popup.style.top = e.clientY + 10 + 'px';
    document.getElementById("aside").appendChild(popup);
    const content = document.createElement("div");
    content.classList.add("content");
    content.textContent = text;
    popup.appendChild(content);


    setTimeout(function() {
        popup.style.setProperty("opacity", "0");
    }, 100)
    setTimeout(function() {
        popup.remove();
    }, 3000)
}

function createWinScreen(text) {
    const winningPopup = document.createElement("div");
    winningPopup.classList.add("ending");
    winningPopup.classList.add("winning");
    const content = document.createElement("div");
    content.classList.add("content");
    content.textContent = text;
    winningPopup.appendChild(content);

    const btn = document.createElement("button");
    btn.textContent = "Level select";

    btn.addEventListener("click", () => {
        switchScreen(levelSelect);
        winningPopup.remove();
    });

    winningPopup.append(btn);

    level.appendChild(winningPopup);
    levelsContainer.childNodes[level.id - 1].classList.add("complete");
}

function createLoseScreen(text) {
    const winningPopup = document.createElement("div");
    winningPopup.classList.add("ending");
    winningPopup.classList.add("losing");
    const content = document.createElement("div");
    content.classList.add("content");
    content.textContent = text;
    winningPopup.appendChild(content);

    const btn = document.createElement("button");
    btn.textContent = "Level select";

    btn.addEventListener("click", () => {
        switchScreen(levelSelect);
        winningPopup.remove();
    });

    const btnUndo = document.createElement("button");
    btnUndo.textContent = "Undo";

    btnUndo.addEventListener("click", () => {
        undo();
        winningPopup.remove();
    });

    winningPopup.append(btn);
    winningPopup.append(btnUndo);

    level.appendChild(winningPopup);
}

function checkTriplet(item) {

    const row = item.row;
    const col = item.col;
    const type = item.type;

    const directions = [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 }
    ];

    for (let dir of directions) {

        let line = [{ row, col }];

        let i = row + dir.dx;
        let j = col + dir.dy;

        while (checkOverflow(i, j)) {
            const cell = board.childNodes[i].childNodes[j];
            if (
                cell.childNodes.length > 0 &&
                cell.childNodes[0].dataset.type === type
            ) {
                line.push({ row: i, col: j });
                i += dir.dx;
                j += dir.dy;
            } else break;
        }

        i = row - dir.dx;
        j = col - dir.dy;

        while (checkOverflow(i, j)) {
            const cell = board.childNodes[i].childNodes[j];
            if (
                cell.childNodes.length > 0 &&
                cell.childNodes[0].dataset.type === type
            ) {
                line.push({ row: i, col: j });
                i -= dir.dx;
                j -= dir.dy;
            } else break;
        }

        if (line.length >= 3) {
            for (let cell of line) {
                if (!board.erase.some(e => e.row === cell.row && e.col === cell.col)) {
                    board.erase.push(cell);
                }
            }

            const sorted = line.sort((a, b) =>
                dir.dx !== 0 ? a.row - b.row : a.col - b.col
            );

            const first = sorted[0];
            const last = sorted[sorted.length - 1];

            const isNewFirst = board.moved.some(m => m.row === first.row && m.col === first.col);
            const isNewLast = board.moved.some(m => m.row === last.row && m.col === last.col);
            const isNewMiddle = board.moved.some(m =>
                !(m.row === first.row && m.col === first.col) &&
                !(m.row === last.row && m.col === last.col) &&
                line.some(l => l.row === m.row && l.col === m.col)
            );


            if (isNewMiddle) {
                console.log("middle");
                board.pushes.push({ from: {row: first.row - dir.dx, col: first.col - dir.dy}, dx: -dir.dx, dy: -dir.dy });
                board.pushes.push({ from: {row: last.row + dir.dx, col: last.col + dir.dy}, dx: dir.dx, dy: dir.dy });
            }

            if (isNewFirst) {
                console.log("first");
                board.pushes.push({ from: {row: last.row + dir.dx, col: last.col + dir.dy}, dx: dir.dx, dy: dir.dy });
            }

            if (isNewLast) {
                console.log("last");
                board.pushes.push({ from: {row: first.row - dir.dx, col: first.col - dir.dy}, dx: -dir.dx, dy: -dir.dy });
            }
        }
    }
}


/* Potentially extendable to other item types.
   Paradox shall not be a part of any combination (at least, for now). */

function checkCombination(item) {
    switch(item.type) {
        case "orb-red":
            checkTriplet(item);
            break;
        case "orb-green":
            checkTriplet(item);
            break;
        case "orb-blue":
            checkTriplet(item);
            break;
        default:
            break;

    }
}

function animatePiece(board, piece, cell, dstCell, shouldAdd) {
    const deltaX = (dstCell.dataset.i - cell.dataset.i) * cell_size * 2;
    const deltaY = (dstCell.dataset.j - cell.dataset.j) * cell_size * 2;

    const movingPiece = piece.cloneNode(true);
    movingPiece.classList.add("moving");

    cell.appendChild(movingPiece);
    cell.removeChild(piece);

    setTimeout(function() {
        if (deltaY > 0) {
            movingPiece.style.setProperty("margin-left", deltaY + "px");
        } else {
            movingPiece.style.setProperty("margin-right", -deltaY + "px");
        }

        if (deltaX > 0) {
            movingPiece.style.setProperty("margin-top", deltaX + "px");
        } else {
            movingPiece.style.setProperty("margin-bottom", -deltaX + "px");
        }
    }, 50)

    piece.dataset.row = dstCell.dataset.i;
    piece.dataset.col = dstCell.dataset.j;

    setTimeout(function() {
        if (shouldAdd) {
            dstCell.appendChild(piece);
        }
        cell.removeChild(movingPiece)
    }, 350);
}

function erasePiece(board, cell, piece) {
    const vanishingPiece = piece.cloneNode(true);
    vanishingPiece.classList.add("vanishing");
    cell.appendChild(vanishingPiece);
    cell.removeChild(piece);

    setTimeout(function() {
        vanishingPiece.style.setProperty("opacity", 0);
    }, 50)

    setTimeout(function() {
        cell.removeChild(vanishingPiece);
    }, 350);
}

function makePush() {

    const moveMap = new Map();
    const moveMapFrom = new Map();

    for (let push of board.pushes) {

        const targetRow = push.from.row + push.dx;
        const targetCol = push.from.col + push.dy;

        if (!checkOverflow(targetRow, targetCol)) continue;

        const key = targetRow + "," + targetCol;
        const keyFrom = push.from.row + "," + push.from.col;

        if (!moveMap.has(key)) {
            moveMap.set(key, []);
        }

        if (!moveMapFrom.has(keyFrom)) {
            moveMapFrom.set(keyFrom, []);
        }

        if (!moveMap.get(key).includes(keyFrom)) {
            moveMap.get(key).push(keyFrom);
        }
        if (!moveMapFrom.get(keyFrom).includes(key)) {
            moveMapFrom.get(keyFrom).push(key);
        }
    }

    const pushedSources = new Set();

    for (let push of board.pushes) {
        const key = push.from.row + "," + push.from.col;
        pushedSources.add(key);
    }


    console.log(moveMapFrom)

    moveMap.forEach((sources, key) => {

        const [r, c] = key.split(",").map(Number);

        let counter = 0;
        sources.forEach(srcKey => {
            const [sr, sc] = srcKey.split(",").map(Number);
            const cell = board.childNodes[sr].childNodes[sc];
            const type = cell?.childNodes[0]?.dataset?.type;
            if (type) {
                ++counter;
            }
        });

        if (counter > 1) {

            sources.forEach(srcKey => {
                const [sr, sc] = srcKey.split(",").map(Number);
                const fromCell = board.childNodes[sr].childNodes[sc];
                const toCell = board.childNodes[r].childNodes[c];
                const piece = fromCell.childNodes[0];
                animatePiece(board, piece, fromCell, toCell, false);
            });

            addItem({ row: r, col: c, type: "paradox" }, false);

        } else {

            const source = sources[0];
            const [rw, cl] = source.split(",").map(Number);

            const cell = board.childNodes[rw].childNodes[cl];
            const type = cell?.childNodes[0]?.dataset?.type;

            if (!type) return;


            if (moveMapFrom.get(source).length > 1) {
                removeItem(rw, cl);
                addItem({ row: rw, col: cl, type: "paradox" }, false);
                return;
            }

            const fromCell = board.childNodes[rw].childNodes[cl];
            const toCell = board.childNodes[r].childNodes[c];

            if (fromCell && fromCell.childNodes.length > 0 && toCell.childNodes.length === 0) {
                const piece = fromCell.childNodes[0];
                animatePiece(board, piece, fromCell, toCell, true);
            }
        }
    });

}

function runBoard() {

    level.dataset.state = "moving"; // lock the board while performing all the pushes

    // Update the board iteratively. During one iteration, all combinations and pushes should be made simultaneously.
    let timerId = setTimeout(function iteration() {
        board.erase = [];
        board.pushes = [];


        for (let i = 0; i < board.moved.length; ++i) {
            checkCombination(board.moved[i]);
        }


        // No combinations made - can finish
        if (board.erase.length === 0) {
            board.moved = [];
            level.dataset.state = "running";
            checkWin();
            return;
        }

        for (let cellData of board.erase) {
            const cell = board.childNodes[cellData.row].childNodes[cellData.col];
            if (cell.childNodes.length > 0) {
                const piece = cell.childNodes[0];
                erasePiece(board, cell, piece);
            }
        }

        makePush();

        setTimeout(function it() {
            board.moved = [];
            for (let push of board.pushes) {
                const row = push.from.row + push.dx;
                const col = push.from.col + push.dy;
                if (checkOverflow(row, col) && board.childNodes[row].childNodes[col].childNodes.length > 0) {
                    const item = board.childNodes[row].childNodes[col].childNodes[0];
                    board.moved.push({row, col, type: item.dataset.type});
                }

            }
        }, 370)
        timerId = setTimeout(iteration, 400); // Board shall let all the animations finish
    }, 400);                                  // and only then proceed to next iteration

}

function makeMove(invPosition, i, j, evt) {
    const cell = board.childNodes[i].childNodes[j];
    const invEntry = inventory.childNodes[invPosition];
    if (cell.childNodes.length > 0) {
        createMessage("Cell is already occupied", evt);
        releaseItem();
    } else {
        level.undoStack.push(exportBoard(false));
        const invItem = invEntry.childNodes[0].childNodes[0];
        console.log(invItem);
        const invType = invItem.dataset.type;
        const item = {
            row: i,
            col: j,
            type: invType,
        }
        releaseItem();
        decrementInv(invPosition);
        addItem(item, true);
    }
}

function undo() {
    console.log(level.undoStack);
    if (level.undoStack.length === 1) {
        return;
    }
    let lastBoard = level.undoStack.pop();
    clearBoard();
    createBoardFromTemplate(lastBoard, false);
    createInventoryFromTemplate(lastBoard);
    level.dataset.state = "running";
}

function decrementInv(pos) {
    const invItem = inventory.childNodes[pos];
    if (invItem.dataset.amount === "1") {
        invItem.remove();
        inventory.style.setProperty("--items-rows", inventory.childNodes.length)
    } else {
        invItem.dataset.amount = parseInt(invItem.dataset.amount) - 1;
        const amount = invItem.childNodes[1];
        amount.textContent = invItem.dataset.amount;
    }

}

function releaseItem() {
    level.dataset.chosen = false;
    if (level.dataset.chosenIdx === "-1") {
        return;
    }
    const chosenIdx = parseInt(level.dataset.chosenIdx)
    console.log(level.dataset.chosenIdx)
    inventory.childNodes[chosenIdx].childNodes[0].classList.remove("chosen");
    level.dataset.chosenIdx = -1;

}

function startLevel(index) {
    clearBoard();
    createBoardFromTemplate(levels[index], true);
    createInventoryFromTemplate(levels[index]);

    level.dataset.state = "running";
    level.dataset.chosen = "false";
    level.dataset.chosenIdx = "-1";
    level.id = levels[index].id;

    switchScreen(level);
}


board.addEventListener("click", function(evt) {
    if (level.dataset.state === "running") {
        if (level.dataset.chosen === "true") {
            if (evt.target.classList.contains("cell") || evt.target.classList.contains("item")) {
                if (evt.target.classList.contains("cell")) {
                    const i = parseInt(evt.target.dataset["i"]);
                    const j = parseInt(evt.target.dataset["j"]);
                    makeMove(parseInt(level.dataset.chosenIdx), i, j, evt);
                } else {
                    const i = parseInt(evt.target.dataset["row"]);
                    const j = parseInt(evt.target.dataset["col"]);
                    makeMove(parseInt(level.dataset.chosenIdx), i, j, evt);
                }
                return;
            } else {
                createMessage("Wrong move position", evt);
                releaseItem();
            }
        } else {
            createMessage("Choose an item first", evt);
        }
    }
})

inventory.addEventListener("click", function(evt) {
    if (level.dataset.state === "running") {
        if (level.dataset.chosen === "false") {
            level.dataset.chosen = "true";
            if (evt.target.classList.contains("cell") || evt.target.classList.contains("item")) {
                const invCell = evt.target.closest(".cell");
                invCell.classList.add("chosen");
                const invEntry = evt.target.closest(".inv-item")
                const index = [...invEntry.parentNode.children].indexOf(invEntry);
                console.log(index);
                level.dataset.chosenIdx = index;
            }
        } else {
            releaseItem();
        }
    }
})





