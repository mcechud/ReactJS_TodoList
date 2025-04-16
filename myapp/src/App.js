// App.js
import React, { useState, useRef, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from 'bootstrap/js/dist/modal';
import * as XLSX from 'xlsx';
import { FaTrash, FaFileExport, FaFileImport, FaLock, FaLockOpen, FaCheck, FaTimes, FaSave } from "react-icons/fa";

function TodoApp() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 10;
  const fileInputRef = useRef();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleAddTask = () => {
    if (input.trim() === "") return;
    const trimmedInput = input.trim();
    const inputKey = trimmedInput.toLowerCase();
    const exists = tasks.some(task => task.text.trim().toLowerCase() === inputKey);
    if (exists) return;
    const newTask = { id: Date.now(), text: trimmedInput, done: false, locked: false };
    setTasks([...tasks, newTask]);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleAddTask();
  };

  const handleStatusChange = (id, status) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, done: status } : task));
  };

  const handleDelete = (id) => {
    const taskToDelete = tasks.find(task => task.id === id);
    if (taskToDelete.locked) return;
    setTasks(tasks.filter(task => task.id !== id));
  };

  const toggleLock = (id) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, locked: !task.locked } : task));
  };

  const handleClearAll = () => {
    const modalElement = document.getElementById('confirmModal');
    const modal = new Modal(modalElement);
    modal.show();
  };

  const confirmClearAll = () => {
    const unlockedTasks = tasks.filter(task => task.locked);
    setTasks(unlockedTasks);
    setInput("");
    setCurrentPage(1);
    const modalElement = document.getElementById('confirmModal');
    const modalInstance = Modal.getInstance(modalElement);
    modalInstance.hide();
  };

  const handleSaveToDB = () => {
    const modalElement = document.getElementById('saveDBConfirmModal');
    const modal = new Modal(modalElement);
    modal.show();
  };

  const confirmSaveTasksToDB = () => {
    // Simulate saving to database
    const modalElement = document.getElementById('saveDBConfirmModal');
    const modalInstance = Modal.getInstance(modalElement);
    modalInstance.hide();
  };

  const handleExportToExcel = () => {
    const data = tasks.map(({ text, done }) => ({
      Task: text,
      Completed: done ? 'Yes' : 'No'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
      fill: { patternType: "solid", fgColor: { rgb: "228B22" } },
    };
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }
    worksheet['!cols'] = [
      { wch: Math.max(...data.map(row => row.Task.length), 10) },
      { wch: 12 }
    ];
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, "TodoList.xlsx");
  };

  const handleImportFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const sheetName = wb.SheetNames[0];
      const worksheet = wb.Sheets[sheetName];
      const importedData = XLSX.utils.sheet_to_json(worksheet);
      const currentTexts = new Set(tasks.map(task => task.text.trim().toLowerCase()));
      const newTasks = [];
      importedData.forEach(item => {
        const taskText = (item.Task || "").trim();
        const taskKey = taskText.toLowerCase();
        if (taskText && !currentTexts.has(taskKey)) {
          currentTexts.add(taskKey);
          newTasks.push({
            id: Date.now() + Math.random(),
            text: taskText,
            done: item.Completed === 'Yes',
            locked: false
          });
        }
      });
      if (newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
      }
      fileInputRef.current.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(tasks.length / tasksPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <div className="container py-5">
      <div className="card shadow border-0 rounded-4">
        <div className="card-body p-4">
          <h2 className="text-center mb-4 fw-bold text-primary">React Todo List</h2>
          <div className="input-group mb-4">
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="What do you need to do?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="btn btn-lg btn-primary" onClick={handleAddTask}>Add</button>
          </div>

          {tasks.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50%' }}>Task</th>
                    <th style={{ width: '30%' }}>Status</th>
                    <th style={{ width: '20%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.text}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <input
                            type="radio"
                            className="btn-check"
                            name={`status-${task.id}`}
                            id={`done-${task.id}`}
                            checked={task.done}
                            onChange={() => handleStatusChange(task.id, true)}
                          />
                          <label className="btn btn-outline-success" htmlFor={`done-${task.id}`}>
                            {isMobile ? <FaCheck /> : 'Completed'}
                          </label>
                          <input
                            type="radio"
                            className="btn-check"
                            name={`status-${task.id}`}
                            id={`not-done-${task.id}`}
                            checked={!task.done}
                            onChange={() => handleStatusChange(task.id, false)}
                          />
                          <label className="btn btn-outline-secondary" htmlFor={`not-done-${task.id}`}>
                            {isMobile ? <FaTimes /> : 'Not Completed'}
                          </label>
                        </div>
                      </td>
                      <td className="flex gap-2 mx-2">
                        <button className="btn btn-sm btn-outline-danger mx-1" onClick={() => handleDelete(task.id)} disabled={task.locked}>
                          <FaTrash />
                        </button>
                        <button className="btn btn-sm btn-outline-dark mx-1" onClick={() => toggleLock(task.id)}>
                          {task.locked ? <FaLock /> : <FaLockOpen />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tasks.length > 0 && (
          <nav className="my-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={goToPreviousPage}>Previous</button>
              </li>
              {[...Array(totalPages)].map((_, i) => (
                <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => paginate(i + 1)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={goToNextPage}>Next</button>
              </li>
            </ul>
          </nav>
          )}

          <div className="d-flex flex-wrap justify-content-center gap-3">
            <button
              className="btn btn-warning text-white"
              onClick={handleClearAll}
              disabled={tasks.length === 0}
            >
              {isMobile ? <FaTrash /> : 'Remove All Tasks'}
            </button>
            <button
              className="btn btn-info text-white"
              onClick={handleSaveToDB}
              disabled={tasks.length === 0}
            >
              {isMobile ? <FaSave /> : 'Save to Database'}
            </button>
            <button
              className="btn btn-success"
              onClick={handleExportToExcel}
              disabled={tasks.length === 0}
            >
              {isMobile ? <FaFileExport /> : 'Export to Excel'}
            </button>
            <label className="btn btn-outline-primary mb-0">
              {isMobile ? <FaFileImport /> : 'Import Excel'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="modal fade" id="confirmModal" tabIndex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="confirmModalLabel">Confirm Deletion</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              Are you sure you want to remove all tasks? This action cannot be undone.
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmClearAll}>Yes, Delete All</button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="saveDBConfirmModal" tabIndex="-1" aria-labelledby="saveDBConfirmModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="saveDBConfirmModalLabel">Saving to database</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              The tasks will be saved to database. Are you sure you want to proceed?
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-success" onClick={confirmSaveTasksToDB}>Yes, Save tasks</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default TodoApp;



// Note: The Bootstrap modal functionality requires Bootstrap JS to be included in your project.
// You can include it in your index.html or import it in your main JS file.
// Make sure to install the required packages:
// npm install bootstrap xlsx react-icons
// npm install bootstrap@5.1.3
// npm install react-bootstrap@2.0.0
// npm install react-icons@4.2.0
// npm install --save-dev @types/react-bootstrap
// npm install --save-dev @types/react-icons
// npm install --save-dev @types/xlsx
// npm install --save-dev @types/bootstrap    