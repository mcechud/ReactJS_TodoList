// App.js
import React, { useState, useRef, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Modal from "bootstrap/js/dist/modal";
import * as XLSX from "xlsx-js-style";
import {
  FaTrash,
  FaFileExport,
  FaFileImport,
  FaLock,
  FaLockOpen,
  FaCheck,
  FaTimes,
  FaSave,
  FaEdit,
} from "react-icons/fa";

function TodoApp() {
  /* ------------------------------------------------------------------ */
  /* state                                                              */
  /* ------------------------------------------------------------------ */
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 6; // number of tasks per page
  const fileInputRef = useRef();

  /* mobile‑viewpoint detection */
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* edit‑modal state */
  const [editTaskId, setEditTaskId] = useState(null);
  const [editText, setEditText] = useState("");

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */
  const uniqueTextExists = (text, excludeId = null) => {
    const key = text.trim().toLowerCase();
    return tasks.some(
      (t) => t.text.trim().toLowerCase() === key && t.id !== excludeId
    );
  };

  /* ------------------------------------------------------------------ */
  /* add task                                                           */
  /* ------------------------------------------------------------------ */
  const handleAddTask = () => {
    if (input.trim() === "" || uniqueTextExists(input)) return;
    const newTask = {
      id: Date.now(),
      text: input.trim(),
      done: false,
      locked: false,
    };
    setTasks([...tasks, newTask]);
    setInput("");
  };
  const handleKeyPress = (e) => e.key === "Enter" && handleAddTask();

  /* ------------------------------------------------------------------ */
  /* status / delete / lock                                             */
  /* ------------------------------------------------------------------ */
  const handleStatusChange = (id, done) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done } : t)));

  const handleDelete = (id) => {
    const t = tasks.find((x) => x.id === id);
    if (t.locked) return;
    setTasks(tasks.filter((x) => x.id !== id));
  };

  const toggleLock = (id) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, locked: !t.locked } : t)));

  /* ------------------------------------------------------------------ */
  /* clear all                                                          */
  /* ------------------------------------------------------------------ */
  const handleClearAll = () => new Modal("#confirmModal").show();
  const confirmClearAll = () => {
    setTasks(tasks.filter((t) => t.locked)); // keep locked ones
    setCurrentPage(1);
    Modal.getInstance("#confirmModal").hide();
  };

  /* ------------------------------------------------------------------ */
  /* bulk helpers                                                       */
  /* ------------------------------------------------------------------ */
  const lockAll = (lock) =>
    setTasks(tasks.map((t) => ({ ...t, locked: lock })));
  const completeAll = (done) => setTasks(tasks.map((t) => ({ ...t, done })));

  /* ------------------------------------------------------------------ */
  /* edit modal                                                         */
  /* ------------------------------------------------------------------ */
  const openEditModal = (task) => {
    setEditTaskId(task.id);
    setEditText(task.text);
    new Modal("#editModal").show();
  };

  const saveEdit = () => {
    const txt = editText.trim();
    if (!txt || uniqueTextExists(txt, editTaskId)) return;
    setTasks(tasks.map((t) => (t.id === editTaskId ? { ...t, text: txt } : t)));
    Modal.getInstance("#editModal").hide();
    setEditTaskId(null);
    setEditText("");
  };

  /* ------------------------------------------------------------------ */
  /* excel import / export                                              */
  /* ------------------------------------------------------------------ */
  const handleExportToExcel = () => {
    const data = tasks.map(({ text, done }) => ({
      Task: text,
      Completed: done ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(data);

    /* header style */
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
      fill: { patternType: "solid", fgColor: { rgb: "228B22" } },
    };
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[cell]) ws[cell].s = headerStyle;
    }
    ws["!cols"] = [
      { wch: Math.max(...data.map((r) => r.Task.length), 10) },
      { wch: 12 },
    ];
    /* xlsx‑js‑style ignores freeze, safe to keep */
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "TodoList.xlsx");
  };

  const handleImportFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const currentTexts = new Set(
        tasks.map((t) => t.text.trim().toLowerCase())
      );
      const newTasks = data
        .filter((d) => d.Task && !currentTexts.has(d.Task.trim().toLowerCase()))
        .map((d) => ({
          id: Date.now() + Math.random(),
          text: d.Task.trim(),
          done: d.Completed === "Yes",
          locked: false,
        }));
      newTasks.length && setTasks((prev) => [...prev, ...newTasks]);
      fileInputRef.current.value = null;
    };
    reader.readAsBinaryString(file);
  };

  /* ------------------------------------------------------------------ */
  /* pagination helpers                                                 */
  /* ------------------------------------------------------------------ */
  const totalPages = Math.ceil(tasks.length / tasksPerPage) || 1;
  const currentTasks = tasks.slice(
    (currentPage - 1) * tasksPerPage,
    currentPage * tasksPerPage
  );

  /* ------------------------------------------------------------------ */
  /* render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="container p-5">
      <div className="card shadow border-0 rounded-4">
        <div className="card-body p-4">
          <h2 className="text-center mb-4 fw-bold text-primary">
            Todo List (React JS)
          </h2>

          {/* add‑task input */}
          <div className="input-group mb-4">
            <input
              className="form-control form-control-lg"
              placeholder="What do you need to do?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="btn btn-lg btn-primary" onClick={handleAddTask}>
              Add
            </button>
          </div>

          {/* table */}
          {tasks.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "50%" }}>Task</th>
                    <th style={{ width: "30%" }}>Status</th>
                    <th style={{ width: "20%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTasks.map((t) => (
                    <tr key={t.id}>
                      <td>{t.text}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <input
                            type="radio"
                            className="btn-check"
                            name={`s-${t.id}`}
                            id={`done-${t.id}`}
                            checked={t.done}
                            onChange={() => handleStatusChange(t.id, true)}
                          />
                          <label
                            className="btn btn-outline-success"
                            htmlFor={`done-${t.id}`}
                          >
                            {isMobile ? <FaCheck /> : "Completed"}
                          </label>

                          <input
                            type="radio"
                            className="btn-check"
                            name={`s-${t.id}`}
                            id={`nd-${t.id}`}
                            checked={!t.done}
                            onChange={() => handleStatusChange(t.id, false)}
                          />
                          <label
                            className="btn btn-outline-secondary"
                            htmlFor={`nd-${t.id}`}
                          >
                            {isMobile ? <FaTimes /> : "Not Completed"}
                          </label>
                        </div>
                      </td>
                      <td className="flex gap-2 mx-2">
                        <button
                          className="btn btn-sm btn-outline-primary mx-1"
                          onClick={() => openEditModal(t)}
                          disabled={t.locked}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger mx-1"
                          onClick={() => handleDelete(t.id)}
                          disabled={t.locked}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-dark mx-1"
                          onClick={() => toggleLock(t.id)}
                          title={t.locked ? "Unlock" : "Lock"}
                        >
                          {t.locked ? <FaLock /> : <FaLockOpen />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* pagination */}
          {tasks.length > 0 && (
            <nav className="my-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 && "disabled"}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li
                    key={i + 1}
                    className={`page-item ${currentPage === i + 1 && "active"}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages && "disabled"
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}

          {/* bulk buttons */}
          <div className="d-flex flex-wrap justify-content-center gap-3">
            {/* show these ONLY when tasks exist */}
            {tasks.length > 0 && (
              <div className="d-flex flex-wrap justify-content-center gap-3">
                <button
                  className="btn btn-success"
                  onClick={() => completeAll(true)}
                  disabled={tasks.every((t) => t.done) || tasks.length === 0}
                  title="Complete All"
                >
                  {isMobile ? <FaCheck /> : "Complete All"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => completeAll(false)}
                  disabled={tasks.every((t) => !t.done) || tasks.length === 0}
                  title="Mark All Incomplete"
                >
                  {isMobile ? <FaTimes /> : "Mark All Incomplete"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => lockAll(true)}
                  disabled={tasks.every((t) => t.locked) || tasks.length === 0}
                  title="Lock All"
                >
                  {isMobile ? <FaLock /> : "Lock All"}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => lockAll(false)}
                  disabled={tasks.every((t) => !t.locked) || tasks.length === 0}
                  title="Unlock All"
                >
                  {isMobile ? <FaLockOpen /> : "Unlock All"}
                </button>
                <button
                  className="btn btn-warning text-white"
                  onClick={handleClearAll}
                  disabled={tasks.length === 0}
                  title="Remove All Unlocked Tasks"
                >
                  {isMobile ? <FaTrash /> : "Remove All"}
                </button>
                <button
                  className="btn btn-info text-white"
                  onClick={() => new Modal("#saveDBConfirmModal").show()}
                  disabled={tasks.length === 0}
                  title="Save to DB"
                >
                  {isMobile ? <FaSave /> : "Save to DB"}
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleExportToExcel}
                  disabled={tasks.length === 0}
                  title="Export to Excel"
                >
                  {isMobile ? <FaFileExport /> : "Export Excel"}
                </button>
              </div>
            )}
            <label
              className="btn btn-outline-primary mb-0"
              title="Import from Excel"
            >
              {isMobile ? <FaFileImport /> : "Import Excel"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                ref={fileInputRef}
                style={{ display: "none" }}
                onClick={(e) => {
                  e.target.value = null; // reset file input
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}

      {/* confirm‑delete modal */}
      <div
        className="modal fade"
        id="confirmModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirm Deletion</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              Remove all **unlocked** tasks? This can’t be undone.
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmClearAll}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* save‑DB modal (placeholder) */}
      <div
        className="modal fade"
        id="saveDBConfirmModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Save to DB</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              Simulate saving tasks to a database?
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => {
                  /* call your PHP API here */
                  Modal.getInstance("#saveDBConfirmModal").hide();
                }}
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* edit‑task modal */}
      <div
        className="modal fade"
        id="editModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Task</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              <input
                className="form-control"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && saveEdit()}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveEdit}>
                Save
              </button>
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
