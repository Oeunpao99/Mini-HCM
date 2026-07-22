import ReactMarkdown from "react-markdown";

export default function AiMessageContent({ text, data }) {
  const employee = data?.employee;
  const contactProfile = data?.contact_profile;
  const profilePhoto =
    typeof contactProfile?.profile_photo === "string" &&
    contactProfile.profile_photo.startsWith("/api/media/profile-photos/")
      ? contactProfile.profile_photo
      : null;
  const initials = String(employee?.name || "U")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {employee && contactProfile && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
          {profilePhoto ? (
            <img src={profilePhoto} alt={employee.name || "Staff profile"} className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{employee.name}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{employee.employee_code}</p>
            {(contactProfile.phone || contactProfile.personal_email) && (
              <p className="mt-1 truncate text-xs text-slate-600">
                {[contactProfile.phone, contactProfile.personal_email].filter(Boolean).join(" | ")}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="whitespace-normal leading-[1.28]">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="mb-1 text-base font-bold last:mb-0">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-1 text-sm font-bold last:mb-0">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold last:mb-0">{children}</h3>,
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="mb-1 list-disc space-y-0 pl-4 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-1 list-decimal space-y-0 pl-4 last:mb-0">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            img: ({ src, alt }) =>
              typeof src === "string" && src.startsWith("/api/media/profile-photos/") ? (
                <img src={src} alt={alt || "Staff profile"} className="my-1 h-16 w-16 rounded-full object-cover ring-1 ring-slate-200" />
              ) : null,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </>
  );
}
