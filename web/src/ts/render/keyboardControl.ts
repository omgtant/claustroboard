import { Pos } from "../types/util";
import { board, getElementByPos } from "./render";

let _currentSelection: Pos | null = null;
let _selectionElement: HTMLElement | null = null;
let _preserveFocus = false;

export function setCurrentSelection(pos: Pos | null): void {
    _currentSelection = pos;
    renderSelection();
}

function getOrCreateSelectionElement(): HTMLElement {
    if (_selectionElement) {
        return _selectionElement;
    }
    const selectionElement = document.createElement("div");
    selectionElement.setAttribute("tabindex", "0");
    selectionElement.className = "selection";
    document.body.appendChild(selectionElement);
    _selectionElement = selectionElement;
    attachControls(_selectionElement);
    return _selectionElement;
}

function renderSelection() {
    if (!_currentSelection) {
        if (_selectionElement) {
            _selectionElement.remove();
        }
        _selectionElement = null;
        return;
    }

    if (!_selectionElement) {
        board?.appendChild(getOrCreateSelectionElement());
    } else {
        FLIPBegin();
    }

    const tileElement = getElementByPos(_currentSelection);
    if (tileElement) {
        const rect = tileElement.getBoundingClientRect();
        const boardRect = board?.getBoundingClientRect();
        _selectionElement!.style.left = `${rect.left - boardRect!.left + 1}px`;
        _selectionElement!.style.top = `${rect.top - boardRect!.top + 1}px`;
    }

    document.querySelectorAll('.move-arrow-shown').forEach(arrow => {
        arrow.classList.remove('move-arrow-shown');
    });
    if (document.activeElement === _selectionElement) {
        document.querySelector(`.move-arrow[data-tile-id="${_currentSelection.x}-${_currentSelection.y}"]`)?.classList.add('move-arrow-shown');
    }
    if (_preserveFocus) {
        _selectionElement?.focus();
    }
    FLIPEnd();
}

function attachControls(selEl: HTMLElement) {

    _selectionElement?.addEventListener("keydown", (event) => {
        if (_selectionElement !== document.activeElement) return;
        switch (event.key) {
            case "ArrowUp":
                event.preventDefault();
                if (_currentSelection?.y == 0) {
                    return;
                }
                setCurrentSelection({ x: _currentSelection!.x, y: _currentSelection!.y - 1 });
                break;
            case "ArrowDown":
                event.preventDefault();
                if (_currentSelection?.y == +board?.dataset.height! - 1) {
                    return;
                }
                setCurrentSelection({ x: _currentSelection!.x, y: _currentSelection!.y + 1 });
                break;
            case "ArrowLeft":
                event.preventDefault();
                if (_currentSelection?.x == 0) {
                    return;
                }
                setCurrentSelection({ x: _currentSelection!.x - 1, y: _currentSelection!.y });
                break;
            case "ArrowRight":
                event.preventDefault();
                if (_currentSelection?.x == +board?.dataset.width! - 1) {
                    return;
                }
                setCurrentSelection({ x: _currentSelection!.x + 1, y: _currentSelection!.y });
                break;
            case "Enter":
                event.preventDefault();
                const tileElement = getElementByPos(_currentSelection!);
                if (tileElement) {
                    tileElement.click();
                }
                break;
        }
    });
    _selectionElement?.addEventListener('focusin', () => {
        renderSelection();
        _preserveFocus = true;
    });
    _selectionElement?.addEventListener('focusout', () => {
        renderSelection();
        _preserveFocus = false;
    });
}

function FLIPBegin() {
    if (!_selectionElement) return;

    const rect = _selectionElement.getBoundingClientRect();
    _selectionElement.dataset.x = `${rect.left}px`;
    _selectionElement.dataset.y = `${rect.top}px`;
}

function FLIPEnd() {
    if (!_selectionElement) return;

    const rect = _selectionElement.getBoundingClientRect();
    const dX = rect.left - parseInt(_selectionElement.dataset.x!);
    const dY = rect.top - parseInt(_selectionElement.dataset.y!);

    _selectionElement.animate([
        { transform: `translate(${-dX}px, ${-dY}px)` },
        { transform: `translate(0, 0)` }
    ], {
        duration: 150,
        easing: 'ease-in-out',
        fill: 'forwards',
        composite: 'add'
    });
}