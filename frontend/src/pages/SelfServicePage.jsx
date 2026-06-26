const SelfServicePage = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#151b4f]">Employee Self Service</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Manage your personal information, requests, and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-[#151b4f]">Personal Details</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            View and update your personal information
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-[#151b4f]">My Requests</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Track your leave and overtime requests
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-[#151b4f]">Documents</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Access payslips and official documents
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelfServicePage;
