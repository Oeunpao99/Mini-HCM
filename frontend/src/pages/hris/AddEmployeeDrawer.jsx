import { FiFileText, FiUploadCloud, FiX } from "react-icons/fi";
import { DrawerTabButton, employeeTabs, Field, inputClass } from "./HrisCommon";

function AddEmployeeDrawer({
  open,
  title = "Add New Employee",
  users,
  departments = [],
  subDepartments = [],
  positions = [],
  jobGrades = [],
  employmentStatuses = [],
  managers = [],
  form,
  newEmployee,
  drawerTab,
  canManageEmployees,
  onClose,
  onSave,
  setDrawerTab,
  setForm,
  setNewEmployee,
}) {
  if (!open) return null;

  const setPhotoError = (message) => {
    setNewEmployee((employee) => ({
      ...employee,
      photo_error: message,
    }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoError("Please choose a JPG or PNG image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewEmployee((employee) => ({
        ...employee,
        profile_photo: reader.result,
        photo_error: "",
      }));
    };
    reader.onerror = () => setPhotoError("Could not read the selected image.");
    reader.readAsDataURL(file);
  };

  const goNext = () => {
    const index = employeeTabs.indexOf(drawerTab);
    setDrawerTab(employeeTabs[Math.min(index + 1, employeeTabs.length - 1)]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <aside className="flex h-full w-full max-w-[680px] flex-col bg-white shadow-2xl">
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-7">
          <h2 className="text-2xl font-extrabold text-slate-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md text-slate-700 hover:bg-slate-50"
            aria-label="Close drawer"
          >
            <FiX className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-4 border-b border-slate-200 px-7">
          <DrawerTabButton
            id="personal"
            active={drawerTab}
            onClick={setDrawerTab}
          >
            Personal Information
          </DrawerTabButton>
          <DrawerTabButton id="job" active={drawerTab} onClick={setDrawerTab}>
            Job Information
          </DrawerTabButton>
          <DrawerTabButton
            id="documents"
            active={drawerTab}
            onClick={setDrawerTab}
          >
            Documents
          </DrawerTabButton>
          <DrawerTabButton
            id="history"
            active={drawerTab}
            onClick={setDrawerTab}
          >
            History
          </DrawerTabButton>
        </div>

        <form onSubmit={onSave} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-7">
            {drawerTab === "personal" && (
              <div className="grid gap-6">
                <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
                  <Field label="Profile Photo">
                    <div className="grid gap-2">
                      <label className="grid h-44 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-blue-50/20 text-center text-blue-600 hover:bg-blue-50/50">
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          className="sr-only"
                          onChange={handlePhotoChange}
                        />
                        {newEmployee.profile_photo ? (
                          <img
                            src={newEmployee.profile_photo}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>
                            <FiUploadCloud
                              className="mx-auto h-9 w-9"
                              aria-hidden
                            />
                            <span className="mt-3 block text-sm font-extrabold">
                              Upload Photo
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-slate-500">
                              JPG, PNG (Max 2MB)
                            </span>
                          </span>
                        )}
                      </label>
                      {newEmployee.profile_photo && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewEmployee((employee) => ({
                              ...employee,
                              profile_photo: "",
                              photo_error: "",
                            }))
                          }
                          className="h-9 rounded-md border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Remove Photo
                        </button>
                      )}
                      {newEmployee.photo_error && (
                        <span className="text-xs font-bold text-red-600">
                          {newEmployee.photo_error}
                        </span>
                      )}
                    </div>
                  </Field>
                  <div className="grid gap-4">
                    <Field label="First Name" required>
                      <input
                        className={inputClass}
                        placeholder="Enter first name"
                        value={newEmployee.first_name}
                        onChange={(event) =>
                          setNewEmployee((employee) => ({
                            ...employee,
                            first_name: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Last Name" required>
                      <input
                        className={inputClass}
                        placeholder="Enter last name"
                        value={newEmployee.last_name}
                        onChange={(event) =>
                          setNewEmployee((employee) => ({
                            ...employee,
                            last_name: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Employee ID" required>
                    <input
                      className={`${inputClass} bg-slate-50 text-slate-400`}
                      placeholder="Auto-generated"
                      disabled
                    />
                  </Field>
                  <Field label="Email" required>
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="Enter email address"
                      value={newEmployee.email}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          email: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Phone Number" required>
                    <div className="flex h-11 overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                      <span className="grid w-16 place-items-center border-r border-slate-200 text-sm font-bold text-slate-700">
                        +1
                      </span>
                      <input
                        className="min-w-0 flex-1 px-3 text-sm font-semibold outline-none"
                        placeholder="Enter phone number"
                        value={newEmployee.phone}
                        onChange={(event) =>
                          setNewEmployee((employee) => ({
                            ...employee,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </Field>
                  <Field label="Date of Birth" required>
                    <input
                      className={inputClass}
                      type="date"
                      value={newEmployee.dob}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          dob: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Gender" required>
                    <select
                      className={inputClass}
                      value={newEmployee.gender}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          gender: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="Marital Status">
                    <select
                      className={inputClass}
                      value={newEmployee.marital_status}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          marital_status: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select status</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                    </select>
                  </Field>
                  <Field label="Nationality">
                    <select
                      className={inputClass}
                      value={newEmployee.nationality}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          nationality: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select nationality</option>
                      <option value="Cambodian">Cambodian</option>
                      <option value="Thai">Thai</option>
                      <option value="American">American</option>
                    </select>
                  </Field>
                  <Field label="ID Number / Passport">
                    <input
                      className={inputClass}
                      placeholder="Enter ID or passport number"
                      value={newEmployee.id_number}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          id_number: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <Field label="Address">
                  <textarea
                    className="min-h-28 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter full address"
                    value={newEmployee.address}
                    onChange={(event) =>
                      setNewEmployee((employee) => ({
                        ...employee,
                        address: event.target.value,
                      }))
                    }
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="City">
                    <input
                      className={inputClass}
                      placeholder="Enter city"
                      value={newEmployee.city}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          city: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="State / Province">
                    <input
                      className={inputClass}
                      placeholder="Enter state or province"
                      value={newEmployee.state}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          state: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="ZIP / Postal Code">
                    <input
                      className={inputClass}
                      placeholder="Enter postal code"
                      value={newEmployee.zip}
                      onChange={(event) =>
                        setNewEmployee((employee) => ({
                          ...employee,
                          zip: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            )}

            {drawerTab === "job" && (
              <div className="grid gap-4">
                <Field label="Employee Account">
                  <select
                    className={inputClass}
                    value={form.user_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        user_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Create a new staff account</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.emp_code}
                      </option>
                    ))}
                  </select>
                </Field>
                {!form.user_id && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Role">
                      <select
                        className={inputClass}
                        value={newEmployee.role}
                        onChange={(event) =>
                          setNewEmployee((employee) => ({
                            ...employee,
                            role: event.target.value,
                          }))
                        }
                      >
                        <option value="staff">Staff</option>
                        <option value="line_manager">Line Manager</option>
                        <option value="department_head">Department Head</option>
                        <option value="payroll_officer">Payroll Officer</option>
                      </select>
                    </Field>
                    <Field label="Department" required>
                      <input
                        className={inputClass}
                        list="hris-departments"
                        value={newEmployee.department}
                        onChange={(event) =>
                          setNewEmployee((employee) => ({
                            ...employee,
                            department: event.target.value,
                          }))
                        }
                      />
                      <datalist id="hris-departments">
                        {departments.map((department) => (
                          <option key={department} value={department} />
                        ))}
                      </datalist>
                    </Field>
                    <Field label="Manager">
                      <select
                        className={inputClass}
                        value={newEmployee.manager_id}
                        onChange={(event) =>
                          setNewEmployee((employee) => ({
                            ...employee,
                            manager_id: event.target.value,
                          }))
                        }
                      >
                        <option value="">No manager</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} - {manager.department || "Unassigned"}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Temporary Password" required>
                      <input
                        className={inputClass}
                        type="text"
                        value={newEmployee.temporary_password}
                        onChange={(event) =>
                          setNewEmployee((employee) => ({
                            ...employee,
                            temporary_password: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Position">
                    <input
                      className={inputClass}
                      list="hris-positions"
                      value={form.position}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          position: event.target.value,
                        }))
                      }
                    />
                    <datalist id="hris-positions">
                      {positions.map((position) => (
                        <option key={position} value={position} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Subdepartment">
                    <input
                      className={inputClass}
                      list="hris-sub-departments"
                      value={form.sub_department}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          sub_department: event.target.value,
                        }))
                      }
                    />
                    <datalist id="hris-sub-departments">
                      {subDepartments.map((subDepartment) => (
                        <option key={subDepartment} value={subDepartment} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Job Grade">
                    <select
                      className={inputClass}
                      value={form.job_grade}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          job_grade: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select grade</option>
                      {jobGrades.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Contract Type">
                    <select
                      className={inputClass}
                      value={form.contract_type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contract_type: event.target.value,
                        }))
                      }
                    >
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="probation">Probation</option>
                      <option value="part_time">Part Time</option>
                    </select>
                  </Field>
                  <Field label="Start Date">
                    <input
                      className={inputClass}
                      type="date"
                      value={form.contract_start_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contract_start_date: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Basic Salary">
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      value={form.basic_salary}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          basic_salary: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Employment Status">
                    <select
                      className={inputClass}
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      {employmentStatuses.map((status) => (
                        <option key={status} value={status}>{status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Bank Account">
                  <input
                    className={inputClass}
                    value={form.bank_account}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bank_account: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            )}

            {drawerTab === "documents" && (
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "National ID",
                  "Employment Contract",
                  "Tax Form",
                  "Bank Form",
                ].map((label) => (
                  <button
                    type="button"
                    key={label}
                    className="flex min-h-28 items-center gap-4 rounded-lg border border-dashed border-slate-300 p-4 text-left text-slate-600 hover:border-blue-300 hover:bg-blue-50/40"
                  >
                    <FiFileText className="h-7 w-7 text-blue-600" aria-hidden />
                    <span>
                      <span className="block text-sm font-extrabold text-slate-900">
                        {label}
                      </span>
                      <span className="mt-1 block text-xs font-semibold">
                        Upload document
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {drawerTab === "history" && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                Employment history will appear after the employee profile is
                saved.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-7 py-5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 min-w-32 rounded-md border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {drawerTab === "job" ? (
              <button
                type="submit"
                disabled={!canManageEmployees}
                className="h-11 min-w-32 rounded-md bg-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                Save
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="h-11 min-w-32 rounded-md bg-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20"
              >
                Next
              </button>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}

export default AddEmployeeDrawer;
