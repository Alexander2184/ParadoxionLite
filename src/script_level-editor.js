const body = document.querySelector("body");
const board = document.getElementById("board-editor");
const inventory = document.getElementById("inventory-editor");
const level = document.getElementById("level-editor")

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

    board.childNodes[item.row].childNodes[item.col].appendChild(elem);
    if (run) {
        board.moved.push(item);
        runBoard();
    }
}

function removeItem(i, j) {
    board.childNodes[i].childNodes[j].childNodes[0].remove();
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
    }
    if (inventory.childNodes.length === 0) {
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
            addItem({ row: r, col: c, type: "paradox" }, false);
        } else {

            const source = sources[0];
            const [rw, cl] = source.split(",").map(Number);
            if (moveMapFrom.get(source).length > 1) {
                const [r1, c1] = source.split(",").map(Number);
                addItem({ row: r1, col: c1, type: "paradox" }, false);
                return;
            }

            const cell = board.childNodes[rw].childNodes[cl];
            const type = cell?.childNodes[0]?.dataset?.type;

            if (!type) return;

            addItem({ row: r, col: c, type }, false);
        }
    });

    pushedSources.forEach(key => {
        const [r, c] = key.split(",").map(Number);
        if (
            board.childNodes[r] &&
            board.childNodes[r].childNodes[c] &&
            board.childNodes[r].childNodes[c].childNodes.length > 0
        ) {
            removeItem(r, c);
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

        for (let cell of board.erase) {
            removeItem(cell.row, cell.col);
        }

        makePush();

        board.moved = [];
        for (let push of board.pushes) {
            const row = push.from.row + push.dx;
            const col = push.from.col + push.dy;
            if (checkOverflow(row, col) && board.childNodes[row].childNodes[col].childNodes.length > 0) {
                const item = board.childNodes[row].childNodes[col].childNodes[0];

                board.moved.push({row, col, type: item.dataset.type});
            }

        }
        console.log("!!!!");7
        timerId = setTimeout(iteration, 250);
    }, 250);

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
    if (level.dataset.chosenIdx === -1) {
        return;
    }
    const chosenIdx = parseInt(level.dataset.chosenIdx)
    inventory.childNodes[chosenIdx].childNodes[0].classList.remove("chosen");
    level.dataset.chosenIdx = -1;

}

function createEditorPanel() {
    const panel = document.createElement("div");
    panel.id = "editor-panel";
    level.appendChild(panel);

    createSizeControls(panel);
    createPalette(panel);
    createExportButton(panel);
}

function createButton(text, onClick) {
    const button = document.createElement("button");
    button.classList.add("editor-button");
    button.textContent = text;

    button.addEventListener("click", function(evt) {
        evt.stopPropagation();
        onClick();
    });

    return button;
}

function createSizeControls(panel) {
    const controls = document.createElement("div");
    controls.classList.add("editor-controls");

    const addWidth = createButton("+W", () => resizeBoard(board.width + 1, board.height));
    const subWidth = createButton("-W", () => resizeBoard(board.width - 1, board.height));

    const addHeight = createButton("+H", () => resizeBoard(board.width, board.height + 1));
    const subHeight = createButton("-H", () => resizeBoard(board.width, board.height - 1));

    controls.append(subWidth, addWidth, subHeight, addHeight);
    panel.appendChild(controls);
}

function resizeBoard(newWidth, newHeight) {
    const data = exportBoard();

    board.innerHTML = "";
    createEmptyBoard(newWidth, newHeight);

    data.board_items.forEach(item => {
        if (item.row < newWidth && item.col < newHeight) {
            addItem(item, false);
        }
    });
}


let selectedEditorType = null;

function createPalette(panel) {
    const palette = document.createElement("div");
    palette.classList.add("editor-palette");

    const types = ["orb-red", "orb-green", "orb-blue", "paradox"];

    types.forEach(type => {
        const cell = document.createElement("div");
        cell.classList.add("cell");

        const item = document.createElement("div");
        item.classList.add("item", type);
        item.dataset.type = type;
        cell.appendChild(item);

        cell.addEventListener("click", function(evt) {
            evt.stopPropagation();
            selectEditorItem(type, cell);
        });

        palette.appendChild(cell);
    });

    const emptyCell = document.createElement("div");
    emptyCell.classList.add("cell");

    emptyCell.addEventListener("click", function(evt) {
        evt.stopPropagation();
        selectEditorItem("empty", emptyCell);
    });

    palette.appendChild(emptyCell);

    panel.appendChild(palette);
}

const default_level = {
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

initLevelProperties();
level.dataset.mode = "editor";
createBoardFromTemplate(default_level);
createInventoryFromTemplate(default_level);
createEditorPanel();

board.addEventListener("click", function(evt) {
    if (level.dataset.mode !== "editor") return;
    if (!selectedEditorType) return;

    const cell = evt.target.closest(".cell");
    if (!cell) return;

    const i = parseInt(cell.dataset.i);
    const j = parseInt(cell.dataset.j);

    if (selectedEditorType === "empty") {
        if (cell.childNodes.length > 0) {
            removeItem(i, j);
        }
        return;
    }

    if (cell.childNodes.length > 0) {
        removeItem(i, j);
    }

    addItem({ row: i, col: j, type: selectedEditorType }, false);
});

inventory.addEventListener("click", function(evt) {
    if (level.dataset.mode !== "editor") return;

    const invEntry = evt.target.closest(".inv-item");

    // Добавление
    if (selectedEditorType && selectedEditorType !== "empty") {

        // ищем существующий тип
        const existing = [...inventory.children].find(entry =>
            entry.querySelector(".item").dataset.type === selectedEditorType
        );

        if (existing) {
            const amount = parseInt(existing.dataset.amount);
            existing.dataset.amount = amount + 1;
            existing.querySelector(".inv-amount").textContent = amount + 1;
        } else {
            addInventoryItem({ type: selectedEditorType, amount: 1 });
        }

        inventory.style.setProperty("--items-rows", inventory.children.length);
        return;
    }

    // Удаление (режим empty)
    if (selectedEditorType === "empty" && invEntry) {
        const amount = parseInt(invEntry.dataset.amount);

        if (amount > 1) {
            invEntry.dataset.amount = amount - 1;
            invEntry.querySelector(".inv-amount").textContent = amount - 1;
        } else {
            invEntry.remove();
        }

        inventory.style.setProperty("--items-rows", inventory.children.length);
    }
});

function selectEditorItem(type, element) {
    selectedEditorType = type;

    document.querySelectorAll(".editor-palette .cell")
        .forEach(el => el.classList.remove("chosen"));

    element.classList.add("chosen");
}

function createExportButton(panel) {
    const exportBtn = createButton("Export Level", () => {
        const data = exportBoard();
        window.lastExportedLevel = data;   // доступ из консоли
        console.log("Level saved to window.lastExportedLevel");
    });

    panel.appendChild(exportBtn);
}


