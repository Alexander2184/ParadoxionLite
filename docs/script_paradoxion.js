const body = document.querySelector("body");
const board = document.getElementById("board");
const inventory = document.getElementById("inventory");
const level = document.getElementById("level");

const mainMenu = document.getElementById("main-menu");
const levelSelect = document.getElementById("level-select");

const cell_size = 100;

let levels = [];

fetch("levels.json")
    .then(response => response.json())
    .then(data => {
        levels = data;
        generateLevelButtons(); // кнопки теперь генерируем после загрузки
    })
    .catch(err => console.error("Не удалось загрузить уровни:", err));



document.getElementById("btn-play").addEventListener("click", () => {
    showScreen(levelSelect);
});

document.getElementById("btn-back-from-select").addEventListener("click", () => {
    showScreen(mainMenu);
});

function clearBoard() {
    board.innerHTML = "";
    inventory.innerHTML = "";
}

document.getElementById("btn-back-to-menu").addEventListener("click", () => {
    clearBoard();
    showScreen(mainMenu);
});

const levelsContainer = document.getElementById("levels-container");

function generateLevelButtons() {
    levelsContainer.innerHTML = "";

    levels.forEach((lvl, index) => {
        const btn = document.createElement("button");
        btn.textContent = "Level " + lvl.id;

        btn.addEventListener("click", () => {
            startLevel(index);
        });

        levelsContainer.appendChild(btn);
    });
}

generateLevelButtons();

function showScreen(screen) {
    mainMenu.classList.add("hidden");
    levelSelect.classList.add("hidden");
    level.classList.add("hidden");

    screen.classList.remove("hidden");
}

function initLevelProperties() {
    level.dataset.state = "running";
    level.dataset.chosen = "false";
    level.dataset.chosenIdx = "-1";
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

function createBoardFromTemplate(template) {
    createEmptyBoard(template.width, template.height);
    for (let i = 0; i < template.board_items.length; i++) {
        addItem(template.board_items[i], false)
    }
}

function createInventoryFromTemplate(template) {
    console.log(inventory)
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
        createWinMessage("You win!");
    } else if (inventory.childNodes.length === 0) {
        level.dataset.state = "lose";
        createWinMessage("You lose. Try again?");
    }
}

function exportBoard() {
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

    console.log("Exported level:");
    console.log(JSON.stringify(levelData, null, 4));

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

function createMessage(text) {
    console.log("Error: " + text);
    const popup = document.createElement("div");
    popup.classList.add("popup");
    body.appendChild(popup);
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

function createWinMessage(text) {
    const winningPopup = document.createElement("div");
    winningPopup.classList.add("winning");
    const content = document.createElement("div");
    content.classList.add("content");
    content.textContent = text;
    winningPopup.appendChild(content);
    level.appendChild(winningPopup);
    setTimeout(function() {
        winningPopup.style.setProperty("opacity", "0");
    }, 100)
    setTimeout(function() {
        winningPopup.remove();
    }, 3000)
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

function animatePiece(board, piece, cell, dstCell) {
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
        dstCell.appendChild(piece);
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

        if (sources.length > 1) {

            sources.forEach(srcKey => {
                const [sr, sc] = srcKey.split(",").map(Number);
                removeItem(sr, sc);
            });

            addItem({ row: r, col: c, type: "paradox" }, false);

        } else {

            const source = sources[0];
            const [rw, cl] = source.split(",").map(Number);
            if (moveMapFrom.get(source).length > 1) {
                removeItem(rw, cl);
                addItem({ row: rw, col: cl, type: "paradox" }, false);
                return;
            }

            const cell = board.childNodes[rw].childNodes[cl];
            const type = cell?.childNodes[0]?.dataset?.type;

            if (!type) return;


            const fromCell = board.childNodes[rw].childNodes[cl];
            const toCell = board.childNodes[r].childNodes[c];

            if (fromCell && fromCell.childNodes.length > 0) {
                const piece = fromCell.childNodes[0];
                animatePiece(board, piece, fromCell, toCell);
            }
        }
    });

}

function runBoard() {

    level.dataset.state = "moving";
    let timerId = setTimeout(function iteration() {
        board.erase = [];
        board.pushes = [];


        for (let i = 0; i < board.moved.length; ++i) {
            checkCombination(board.moved[i]);
        }

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
        timerId = setTimeout(iteration, 400);
    }, 400);

}

function makeMove(invPosition, i, j) {
    const cell = board.childNodes[i].childNodes[j];
    const invEntry = inventory.childNodes[invPosition];
    if (cell.childNodes.length > 0) {
        createMessage("Cell is already occupied");
        releaseItem();
    } else {
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

let default_level = {
    width: 11,
    height: 11,
    board_items: [
        {
            row: 5,
            col: 4,
            type: "orb-red"
        },
        {
            row: 5,
            col: 6,
            type: "orb-red"
        }
    ],
    inventory: [
        {
            type: "orb-red",
            amount: 1
        },
        {
            type: "orb-green",
            amount: 1
        },
        {
            type: "orb-blue",
            amount: 1
        },
        {
            type: "paradox",
            amount: 1
        }
    ]
}


function startLevel(index) {
    initLevelProperties();
    createBoardFromTemplate(levels[index]);
    createInventoryFromTemplate(levels[index]);

    showScreen(level);
}


board.addEventListener("click", function(evt) {
    if (level.dataset.state === "running") {
        if (level.dataset.chosen === "true") {
            if (evt.target.classList.contains("cell") || evt.target.classList.contains("item")) {
                if (evt.target.classList.contains("cell")) {
                    const i = parseInt(evt.target.dataset["i"]);
                    const j = parseInt(evt.target.dataset["j"]);
                    makeMove(parseInt(level.dataset.chosenIdx), i, j);
                } else {
                    const i = parseInt(evt.target.dataset["row"]);
                    const j = parseInt(evt.target.dataset["col"]);
                    makeMove(parseInt(level.dataset.chosenIdx), i, j);
                }
                return;
            } else {
                createMessage("Wrong move position");
                releaseItem();
            }
        } else {
            createMessage("Choose an item first");
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





