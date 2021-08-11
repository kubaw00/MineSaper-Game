import {Cell} from './Cell.js';
import {UI} from './UI.js';
import {Counter} from './Counter.js';
import { Timer } from './Timer.js';
import { ResetButton} from './ResetButton.js';
import {Modal } from './Modal.js'


class Game extends UI {
    
    //nowa konwencja, prywatność - możemy wywoływać tylko wewnątrz naszej klasy
    #config = {
        easy:{
            rows: 8,
            cols: 8,
            mines: 10,
        },
        normal:{
            rows: 16,
            cols: 16,
            mines: 40,
        },
        expert:{
            rows: 16,
            cols: 30,
            mines: 99,
        },  
    };

    #isGameFinished = false;

    #counter = new Counter();
    #timer = new Timer();
    #modal = new Modal();

    #numberOfRows = null;
    #numberOfCols = null;
    #numbersOfMines = null;

    //tablica komórek
    #cells = [];

    #cellsElements = null;
    #cellsToReveal = 0;
    #revealedCells = 0;

    //zawiera pobrany article__board
    #board = null;

    #buttons = {
        modal: null,
        easy: null,
        normal: null,
        expert: null,
        reset: new ResetButton(),
    }

    initilizeGame() {
        //pobrane elementy + new game
        this.#handleElements();
        this.#counter.init();
        this.#timer.init();
        this.#addButtonsEventListeners()
        this.#newGame(); 
    }

    #newGame(rows = this.#config.easy.rows, cols = this.#config.easy.cols, mines = this.#config.easy.mines){
        this.#numberOfCols = cols;
        this.#numberOfRows = rows;
        this.#numbersOfMines = mines;
  
        this.#counter.setValue(this.#numbersOfMines) 
        this.#timer.resetTimer();

        this.#cellsToReveal = this.#numberOfRows * this.#numberOfCols - this.#numbersOfMines;

        this.#setStyles();
        this.#generateCells();
        this.#renderBoard();

        this.#placesMinesInCells();


        this.#cellsElements = this.getElements(this.UiSelectors.cell);
        this.#buttons.reset.changeEmotion('neutral');

        this.#isGameFinished = false;
        this.#revealedCells = 0;
        this.#addCellsEventListeners(); 
    }

    //koniec gry
    #endGame(isWin) {
       this.#isGameFinished = true;
       this.#timer.stopTimer();
       this.#modal.buttonText = 'Close';


       if(!isWin){
           this.#revealMines();
           this.#modal.infoText = 'You Lost, Try Again'
           this.#buttons.reset.changeEmotion('negative');
           this.#modal.setText();
           setTimeout(() =>  this.#modal.toggleModal(), 800)
          
           return
       }

        this.#modal.infoText = this.#timer.numberOfSeconds < this.#timer.maxNumeberOfSeconds 
        ? `You Won in ${this.#timer.numberOfSeconds} seconds, Congratulations!` 
        : 'You won!!!'
        this.#buttons.reset.changeEmotion('positive');
        this.#modal.setText();
        this.#modal.toggleModal();
    }


    //przechwynie article.game__board
    #handleElements() {
        this.#board = this.getElement(this.UiSelectors.board);
        this.#buttons.modal = this.getElement(this.UiSelectors.modalButton)
        this.#buttons.easy = this.getElement(this.UiSelectors.easyButton)
        this.#buttons.normal = this.getElement(this.UiSelectors.normalButton)
        this.#buttons.expert = this.getElement(this.UiSelectors.expertButton)
    }

    //obsługa zdarzeń

    #addCellsEventListeners() {
        this.#cellsElements.forEach(element => {
            element.addEventListener('click', this.#handleCellClick)
            element.addEventListener('contextmenu', this.#handleCellContextMenu)
        })
    }
    #removeCellsEventListeners() {
        this.#cellsElements.forEach(element => {
            element.removeEventListener('click', this.#handleCellClick)
            element.removeEventListener('contextmenu', this.#handleCellContextMenu)
        })
    }

    #addButtonsEventListeners() { 
        this.#buttons.modal.addEventListener('click', () => this.#modal.toggleModal())
        this.#buttons.easy.addEventListener('click', () => this.#handleNewGameClick(this.#config.easy.rows, this.#config.easy.cols, this.#config.easy.mines));
        this.#buttons.normal.addEventListener('click', () => this.#handleNewGameClick(this.#config.normal.rows, this.#config.normal.cols, this.#config.normal.mines));
        this.#buttons.expert.addEventListener('click', () => this.#handleNewGameClick(this.#config.expert.rows, this.#config.expert.cols, this.#config.expert.mines));
        this.#buttons.reset.element.addEventListener('click', () => this.#handleNewGameClick())

    }

    #handleNewGameClick(rows = this.#numberOfRows, cols = this.#numberOfCols, mines = this.#numbersOfMines) {
        
        this.#removeCellsEventListeners()
        this.#newGame(rows, cols, mines)

    }


    // tworzenie komórek z instancjami w tabilcy
    #generateCells() {
        //czyszczenie tablicy
        this.#cells.length = 0

        for(let row = 0; row < this.#numberOfRows; row++) {
            this.#cells[row] = [];
            for(let col = 0; col < this.#numberOfCols; col++){
                this.#cells[row].push(new Cell(col, row))
                
            }
        }
        
    } 

    //umieszczanie kafelków na planszy i przypisanie do elementu obiektu Cell
    #renderBoard() {

        while(this.#board.firstChild){
            this.#board.removeChild(this.#board.lastChild)
        }
        this.#cells.flat().forEach(cell => {
            this.#board.insertAdjacentHTML('beforeend', cell.createElement())
            cell.element = cell.getElement(cell.selector)
        })
    }

    //umieszcznie min
    #placesMinesInCells() {
        let minesToPlace = this.#numbersOfMines;

        //rób dopóki minesToPlace !== 0
        while(minesToPlace) {
            const rowIndex = this.#getRandomInteger(0, this.#numberOfRows - 1);
            const colIndex = this.#getRandomInteger(0, this.#numberOfCols - 1);

            const cell = this.#cells[rowIndex][colIndex];
            
            const hasCellMine = cell.isMine;

            if(!hasCellMine){
                cell.addMine();
                minesToPlace--
            }
        }
    }

    //obsułga lewego przycisku myszy
    #handleCellClick = (e) => {
        const target = e.target;
        const rowIndex = parseInt(target.getAttribute('data-y'), 10);
        const colIndex = parseInt(target.getAttribute('data-x'), 10);
        const cell = this.#cells[rowIndex][colIndex];
        
        if(cell.isFlagged || cell.isReveal || this.#isGameFinished) return
        this.#clickCell(cell)
    }

    //obsługa prawego przyciku myszy
    #handleCellContextMenu = (e) => {
        e.preventDefault();
        const target = e.target;
        const rowIndex = parseInt(target.getAttribute('data-y'), 10);
        const colIndex = parseInt(target.getAttribute('data-x'), 10);
        const cell = this.#cells[rowIndex][colIndex];
        
        if(cell.isReveal || this.#isGameFinished) return

        if(cell.isFlagged){
            this.#counter.increment()
        } else {
            if(this.#counter.value === 0) return
            this.#counter.decrement();
            
        }

        cell.toggleFlag();
    }

    //czy kliknięte pole jest miną oraz odkrywanie pól
    #clickCell(cell) {
        if(cell.isMine){
            this.#endGame(false)
            return
        }
        this.#setCellValue(cell);
        if(this.#revealedCells === this.#cellsToReveal && !this.#isGameFinished){
            this.#endGame(true)
        }
    }


    #setCellValue(cell) {
        let minesCount = 0;
        for(let rowIndex = Math.max(cell.y - 1, 0); rowIndex <= Math.min(cell.y + 1, this.#numberOfRows - 1); rowIndex++){
            for(let colIndex = Math.max(cell.x - 1, 0); colIndex <=  Math.min(cell.x + 1, this.#numberOfCols -1); colIndex++){
               if(this.#cells[rowIndex][colIndex].isMine) minesCount++
            }
        }
        cell.value = minesCount;
        cell.revealCell()

        this.#revealedCells++;

        if(!cell.value){
            for(let rowIndex = Math.max(cell.y - 1, 0); rowIndex <= Math.min(cell.y + 1, this.#numberOfRows - 1); rowIndex++){
                for(let colIndex = Math.max(cell.x - 1, 0); colIndex <=  Math.min(cell.x + 1, this.#numberOfCols -1); colIndex++){
                    const cell = this.#cells[rowIndex][colIndex]
                   if(!cell.isReveal){
                       this.#clickCell(cell);
                   }
                }
            }
        }
    }


    #revealMines() {
        this.#cells.flat().filter(({isMine}) => isMine).forEach((cell) => cell.revealCell())
    }


    //umieszcznie stylu w html liniowo
    #setStyles(){
        document.documentElement.style.setProperty('--cells-in-row', this.#numberOfCols)
    }

    //losowanie liczb z zakresu min-max
    #getRandomInteger(min,max) {
        return Math.floor(Math.random() * (max-min + 1)) + min
    }

}


window.onload = function (){
    const game = new Game();
    game.initilizeGame(); 
}

