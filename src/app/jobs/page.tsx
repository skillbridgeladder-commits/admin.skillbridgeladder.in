"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FieldType = "short_answer" | "paragraph" | "multiple_choice" | "checkboxes" | "dropdown" | "file_upload" | "date" | "time" | "rating" | "linear_scale" | "email" | "url" | "number" | "phone";

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
    { value: "short_answer", label: "Short Answer", icon: "📄" },
    { value: "paragraph", label: "Paragraph", icon: "📝" },
    { value: "multiple_choice", label: "Multiple Choice", icon: "🔘" },
    { value: "checkboxes", label: "Checkboxes", icon: "✅" },
    { value: "dropdown", label: "Dropdown", icon: "🔽" },
    { value: "file_upload", label: "File Upload", icon: "📁" },
    { value: "date", label: "Date", icon: "📅" },
    { value: "time", label: "Time", icon: "🕒" },
    { value: "rating", label: "Rating", icon: "⭐" },
    { value: "linear_scale", label: "Linear Scale", icon: "📏" },
    { value: "email", label: "Email", icon: "📧" },
    { value: "url", label: "URL", icon: "🔗" },
    { value: "number", label: "Number", icon: "🔢" },
    { value: "phone", label: "Phone", icon: "📞" },
];

interface FormField {
    id: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    required: boolean;
    options?: string[];
    allow_other?: boolean;
    min?: number;
    max?: number;
}

interface Job {
    id: string;
    title: string;
    description: string;
    requirements: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form_schema: any;
    is_active: boolean;
    created_at: string;
}

interface JobTemplate {
    id: string;
    name: string;
    form_schema: any;
}

function parseSchema(schema: any): { fields: FormField[]; collect_email: boolean } {
    if (Array.isArray(schema)) return { fields: schema, collect_email: true };
    if (schema && schema.fields) return { fields: schema.fields, collect_email: schema.collect_email !== false };
    return { fields: [], collect_email: true };
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [requirements, setRequirements] = useState("");
    const [fields, setFields] = useState<FormField[]>([]);
    const [collectEmail, setCollectEmail] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingJob, setEditingJob] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [templates, setTemplates] = useState<JobTemplate[]>([]);
    const [savingTemplate, setSavingTemplate] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchJobs();
        fetchTemplates();
    }, []);

    async function fetchTemplates() {
        const { data } = await supabase.from("job_templates").select("*").order("name");
        if (data) setTemplates(data);
    }

    async function fetchJobs() {
        setLoading(true);
        const { data, error: err } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
        if (err) {
            setError("Failed to load jobs: " + err.message);
        } else if (data) {
            setJobs(data as Job[]);
        }
        setLoading(false);
    }

    function addField(type: FieldType = "short_answer") {
        const needsOptions = ["multiple_choice", "checkboxes", "dropdown"].includes(type);
        setFields([
            ...fields,
            {
                id: crypto.randomUUID(),
                label: "",
                type,
                placeholder: "",
                required: false,
                ...(needsOptions ? { options: ["Option 1"] } : {}),
                ...(type === "rating" ? { max: 5 } : {}),
                ...(type === "linear_scale" ? { min: 1, max: 5 } : {}),
            },
        ]);
    }

    function updateField(id: string, updates: Partial<FormField>) {
        setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    }

    function removeField(id: string) {
        setFields(fields.filter((f) => f.id !== id));
    }

    function addOption(fieldId: string) {
        const field = fields.find((f) => f.id === fieldId);
        if (field) {
            updateField(fieldId, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] });
        }
    }

    function updateOption(fieldId: string, index: number, value: string) {
        const field = fields.find((f) => f.id === fieldId);
        if (field && field.options) {
            const newOpts = [...field.options];
            newOpts[index] = value;
            updateField(fieldId, { options: newOpts });
        }
    }

    function removeOption(fieldId: string, index: number) {
        const field = fields.find((f) => f.id === fieldId);
        if (field && field.options && field.options.length > 1) {
            updateField(fieldId, { options: field.options.filter((_, i) => i !== index) });
        }
    }

    function moveField(index: number, direction: -1 | 1) {
        const newFields = [...fields];
        const target = index + direction;
        if (target < 0 || target >= newFields.length) return;
        [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
        setFields(newFields);
    }

    async function saveJob() {
        if (!title.trim()) return;
        setError("");
        setSaving(true);

        const jobData = {
            title: title.trim(),
            description: description.trim(),
            requirements: requirements.trim(),
            form_schema: { fields, collect_email: collectEmail },
        };

        let result;
        if (editingJob) {
            result = await supabase.from("jobs").update(jobData).eq("id", editingJob);
        } else {
            result = await supabase.from("jobs").insert(jobData);
        }

        if (result.error) {
            setError("Failed to save: " + result.error.message);
        } else {
            resetForm();
            fetchJobs();
        }
        setSaving(false);
    }

    async function saveAsTemplate() {
        if (fields.length === 0) return;
        const name = prompt("Enter a name for this template:");
        if (!name) return;

        setSavingTemplate(true);
        const { error: err } = await supabase.from("job_templates").insert({
            name,
            form_schema: { fields, collect_email: collectEmail }
        });

        if (err) {
            alert("Failed to save template: " + err.message);
        } else {
            alert("Template saved successfully! ✨");
            fetchTemplates();
        }
        setSavingTemplate(false);
    }

    function applyTemplate(templateId: string) {
        if (templateId === "none") return;
        const template = templates.find(t => t.id === templateId);
        if (template) {
            const parsed = parseSchema(template.form_schema);
            setFields(parsed.fields);
            setCollectEmail(parsed.collect_email);
        }
    }

    function editJob(job: Job) {
        const parsed = parseSchema(job.form_schema);
        setEditingJob(job.id);
        setTitle(job.title);
        setDescription(job.description || "");
        setRequirements(job.requirements || "");
        setFields(parsed.fields);
        setCollectEmail(parsed.collect_email);
        setShowForm(true);
        setError("");
    }

    function resetForm() {
        setTitle("");
        setDescription("");
        setRequirements("");
        // Add default fields for a better start
        setFields([
            { id: crypto.randomUUID(), label: "Full Name", type: "short_answer" as FieldType, required: true },
            { id: crypto.randomUUID(), label: "Years of Experience", type: "number" as FieldType, required: true }
        ]);
        setCollectEmail(true);
        setShowForm(false);
        setEditingJob(null);
        setError("");
    }

    async function toggleJobActive(id: string, current: boolean) {
        await supabase.from("jobs").update({ is_active: !current }).eq("id", id);
        fetchJobs();
    }

    async function deleteJob(id: string) {
        if (!confirm("Delete this job? Applications linked to it will also be removed.")) return;
        await supabase.from("jobs").delete().eq("id", id);
        fetchJobs();
    }

    const [copyingId, setCopyingId] = useState<string | null>(null);
    function copyShareLink(jobId: string) {
        const url = `https://hire.skillbridgeladder.in/job/${jobId}`;
        navigator.clipboard.writeText(url);
        setCopyingId(jobId);
        setTimeout(() => setCopyingId(null), 2000);
    }

    const inputStyle = {
        background: "var(--bg-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "8px 12px",
        color: "var(--text-primary)",
        fontSize: "13px",
        outline: "none",
        width: "100%",
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>Jobs & Form Builder</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Create job listings with custom application forms</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(!showForm); }}
                    style={{
                        background: showForm ? "rgba(244,63,94,0.1)" : "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                        border: showForm ? "1px solid rgba(244,63,94,0.3)" : "none",
                        borderRadius: "12px",
                        padding: "12px 24px",
                        color: showForm ? "var(--accent-rose)" : "#fff",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    {showForm ? "✕ Cancel" : "＋ New Job"}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--accent-rose)", fontSize: "13px", marginBottom: "20px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* Create/Edit Form */}
            {showForm && (
                <div className="animate-fade-in" style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "24px",
                    padding: "32px",
                    marginBottom: "40px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.05)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>
                            {editingJob ? "✎ Edit Job Listing" : "✨ Create New Opportunity"}
                        </h2>
                        {!editingJob && (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px", background: "rgba(59,130,246,0.05)", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.1)" }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase" }}>Schema Preset:</span>
                                <select
                                    onChange={(e) => applyTemplate(e.target.value)}
                                    style={{ background: "none", border: "none", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                                >
                                    <option value="none">Default Blank</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Job Details */}
                    <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Job Title *
                            </label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Video Editor, UI Designer, Backend Developer"
                                style={{ ...inputStyle, padding: "12px 16px", fontSize: "14px", borderRadius: "10px" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Job Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the role and responsibilities..."
                                rows={3}
                                style={{ ...inputStyle, padding: "12px 16px", fontSize: "14px", borderRadius: "10px", resize: "vertical" as const }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Requirements
                            </label>
                            <textarea
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                                placeholder="Describe the skills and qualifications needed..."
                                rows={3}
                                style={{ ...inputStyle, padding: "12px 16px", fontSize: "14px", borderRadius: "10px", resize: "vertical" as const }}
                            />
                        </div>
                    </div>

                    {/* Collect Email Toggle */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(59,130,246,0.06)", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.15)", marginBottom: "20px" }}>
                        <div>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>✉ Collect email addresses</div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Automatically collect applicant's email from their login</div>
                        </div>
                        <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer" }}>
                            <input type="checkbox" checked={collectEmail} onChange={(e) => setCollectEmail(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                            <span style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: "12px", background: collectEmail ? "var(--accent-blue)" : "var(--border-subtle)", transition: "all 0.2s" }}>
                                <span style={{ position: "absolute", left: collectEmail ? "22px" : "2px", top: "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                            </span>
                        </label>
                    </div>

                    {/* Form Schema Builder */}
                    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Application Form Fields</h3>
                        </div>

                        {/* Add Field Buttons */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px", padding: "16px", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, width: "100%", marginBottom: "6px" }}>ADD FIELD TYPE:</span>
                            {FIELD_TYPES.map((ft) => (
                                <button
                                    key={ft.value}
                                    onClick={() => addField(ft.value)}
                                    style={{
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "8px",
                                        padding: "6px 12px",
                                        color: "var(--text-secondary)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        transition: "all 0.15s",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-blue)"; e.currentTarget.style.color = "var(--accent-blue)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                                >
                                    <span>{ft.icon}</span> {ft.label}
                                </button>
                            ))}
                        </div>

                        {fields.length === 0 && (
                            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "13px" }}>
                                No fields yet. Click a field type above to add it.
                            </div>
                        )}

                        {/* Fields List */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {fields.map((field, i) => {
                                const fieldType = FIELD_TYPES.find((ft) => ft.value === field.type);
                                const hasOptions = ["multiple_choice", "checkboxes", "dropdown"].includes(field.type);

                                return (
                                    <div key={field.id}>
                                        <div
                                            style={{
                                                background: "var(--bg-secondary)",
                                                border: "1px solid var(--border-subtle)",
                                                borderRadius: "12px",
                                                padding: "16px",
                                                borderLeft: "3px solid var(--accent-blue)",
                                            }}
                                        >
                                            {/* Field Header */}
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                                                {/* Drag Handle Icon */}
                                                <div style={{ cursor: "grab", color: "var(--text-muted)", fontSize: "18px", lineHeight: 1 }}>⋮⋮</div>

                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        value={field.label}
                                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                        placeholder="Question / Label *"
                                                        style={{
                                                            ...inputStyle,
                                                            fontSize: "16px",
                                                            fontWeight: 600,
                                                            background: "transparent",
                                                            border: "none",
                                                            borderBottom: "1px solid var(--border-subtle)",
                                                            borderRadius: "0",
                                                            padding: "8px 0"
                                                        }}
                                                    />
                                                </div>

                                                {/* Field Type Selector Dropdown */}
                                                <div style={{ position: "relative", width: "180px" }}>
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                                                        style={{ ...inputStyle, paddingRight: "30px", fontSize: "13px" }}
                                                    >
                                                        {FIELD_TYPES.map((ft) => (
                                                            <option key={ft.value} value={ft.value}>
                                                                {ft.icon} {ft.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "10px", color: "var(--text-muted)" }}>▼</div>
                                                </div>

                                                <button
                                                    onClick={() => removeField(field.id)}
                                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px", padding: "4px" }}
                                                    title="Remove field"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* Field Config / Content Area */}
                                            <div style={{ marginLeft: "28px" }}>
                                                {/* Config Area Content */}
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                                                    {!hasOptions && field.type !== "file_upload" && field.type !== "rating" && field.type !== "linear_scale" && field.type !== "date" && field.type !== "time" && (
                                                        <div style={{ gridColumn: "1 / -1" }}>
                                                            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Placeholder</label>
                                                            <input
                                                                value={field.placeholder || ""}
                                                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                                                placeholder="Short answer text placeholder..."
                                                                style={{ ...inputStyle, background: "transparent", border: "none", borderBottom: "1px dotted var(--border-subtle)", borderRadius: 0 }}
                                                            />
                                                        </div>
                                                    )}

                                                    {field.type === "rating" && (
                                                        <div>
                                                            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Max Stars</label>
                                                            <select value={field.max || 5} onChange={(e) => updateField(field.id, { max: parseInt(e.target.value) })} style={inputStyle}>
                                                                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n} Stars</option>)}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {field.type === "linear_scale" && (
                                                        <>
                                                            <div>
                                                                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>From</label>
                                                                <select value={field.min || 0} onChange={(e) => updateField(field.id, { min: parseInt(e.target.value) })} style={inputStyle}>
                                                                    <option value={0}>0</option>
                                                                    <option value={1}>1</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>To</label>
                                                                <select value={field.max || 5} onChange={(e) => updateField(field.id, { max: parseInt(e.target.value) })} style={inputStyle}>
                                                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Options for MC / Checkboxes / Dropdown */}
                                            {hasOptions && (
                                                <div style={{ marginTop: "12px", marginLeft: "28px" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                        {(field.options || []).map((opt, oi) => (
                                                            <div key={oi} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                                <span style={{ color: "var(--text-muted)", fontSize: "15px", width: "20px" }}>
                                                                    {field.type === "multiple_choice" ? "○" : field.type === "checkboxes" ? "☐" : `${oi + 1}.`}
                                                                </span>
                                                                <input
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(field.id, oi, e.target.value)}
                                                                    placeholder={`Option ${oi + 1}`}
                                                                    style={{ ...inputStyle, flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--border-subtle)", borderRadius: 0, padding: "6px 0" }}
                                                                />
                                                                <button
                                                                    onClick={() => removeOption(field.id, oi)}
                                                                    disabled={(field.options?.length || 0) <= 1}
                                                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px" }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}

                                                        {field.allow_other && (
                                                            <div style={{ display: "flex", gap: "10px", alignItems: "center", opacity: 0.7 }}>
                                                                <span style={{ color: "var(--text-muted)", fontSize: "15px", width: "20px" }}>
                                                                    {field.type === "multiple_choice" ? "○" : "☐"}
                                                                </span>
                                                                <span style={{ flex: 1, fontSize: "14px", color: "var(--text-muted)", borderBottom: "1px dotted var(--border-subtle)", padding: "6px 0" }}>
                                                                    Other...
                                                                </span>
                                                                <button
                                                                    onClick={() => updateField(field.id, { allow_other: false })}
                                                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px" }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginLeft: "30px", marginTop: "4px" }}>
                                                            <button
                                                                onClick={() => addOption(field.id)}
                                                                style={{ background: "none", border: "none", color: "var(--accent-blue)", fontSize: "13px", cursor: "pointer", padding: "4px 0" }}
                                                            >
                                                                + Add option
                                                            </button>
                                                            {(field.type === "multiple_choice" || field.type === "checkboxes") && !field.allow_other && (
                                                                <>
                                                                    <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>or</span>
                                                                    <button
                                                                        onClick={() => updateField(field.id, { allow_other: true })}
                                                                        style={{ background: "rgba(59,130,246,0.1)", border: "none", borderRadius: "4px", color: "var(--accent-blue)", fontSize: "12px", cursor: "pointer", padding: "2px 8px" }}
                                                                    >
                                                                        Add "Other"
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action bar for each field (Required, Move) */}
                                        <div style={{
                                            padding: "8px 16px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "15px",
                                            justifyContent: "flex-end",
                                            background: "var(--bg-secondary)",
                                            border: "1px solid var(--border-subtle)",
                                            borderTop: "none",
                                            borderBottomLeftRadius: "12px",
                                            borderBottomRightRadius: "12px",
                                            marginTop: "-1px",
                                            marginBottom: "12px"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "auto" }}>
                                                <button onClick={() => moveField(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? "var(--text-muted)" : "var(--text-secondary)", cursor: "pointer", fontSize: "16px" }} title="Move Up">↑</button>
                                                <button onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} style={{ background: "none", border: "none", color: i === fields.length - 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: "pointer", fontSize: "16px" }} title="Move Down">↓</button>
                                            </div>

                                            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", padding: "0 10px", borderLeft: "1px solid var(--border-subtle)" }}>
                                                <span>Required</span>
                                                <div style={{ position: "relative", width: "34px", height: "18px" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                        style={{ opacity: 0, width: 0, height: 0 }}
                                                    />
                                                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: "10px", background: field.required ? "var(--accent-blue)" : "var(--border-subtle)", transition: "0.2s" }}>
                                                        <div style={{ position: "absolute", left: field.required ? "18px" : "2px", top: "2px", width: "14px", height: "14px", borderRadius: "50%", background: "#fff", transition: "0.2s" }} />
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Save */}
                    <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button
                                onClick={saveJob}
                                disabled={saving || !title.trim()}
                                style={{
                                    background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                                    border: "none",
                                    borderRadius: "12px",
                                    padding: "12px 32px",
                                    color: "#fff",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: saving ? "wait" : "pointer",
                                    opacity: !title.trim() ? 0.5 : 1,
                                }}
                            >
                                {saving ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
                            </button>
                            <button onClick={resetForm} style={{ background: "transparent", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "12px 24px", color: "var(--text-secondary)", fontSize: "14px", cursor: "pointer" }}>
                                Cancel
                            </button>
                        </div>

                        <button
                            onClick={saveAsTemplate}
                            disabled={fields.length === 0 || savingTemplate}
                            style={{
                                background: "rgba(139,92,246,0.1)",
                                border: "1px solid rgba(139,92,246,0.2)",
                                borderRadius: "12px",
                                padding: "12px 20px",
                                color: "var(--accent-violet)",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer"
                            }}
                        >
                            {savingTemplate ? "Saving..." : "💾 Save as Template"}
                        </button>
                    </div>
                </div>
            )}

            {/* Jobs List */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "40px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>Manage Jobs</h2>
                {loading ? (
                    <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>Loading jobs...</div>
                ) : jobs.length === 0 && !error ? (
                    <div style={{ textAlign: "center", padding: "60px", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
                        <div style={{ color: "var(--text-secondary)" }}>No jobs created yet</div>
                        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>Click &quot;+ New Job&quot; to create your first listing</p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: "16px" }}>
                        {jobs.map((job) => (
                            <div key={job.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                                            <h3 style={{ fontSize: "17px", fontWeight: 700 }}>{job.title}</h3>
                                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: job.is_active ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)", color: job.is_active ? "var(--accent-emerald)" : "var(--text-muted)", border: `1px solid ${job.is_active ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.3)"}` }}>
                                                {job.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        {job.description && <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "10px" }}>{job.description}</p>}
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                            {parseSchema(job.form_schema).fields.map((f: FormField) => {
                                                const ft = FIELD_TYPES.find((t) => t.value === f.type);
                                                return (
                                                    <span key={f.id} style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(139,92,246,0.08)", fontSize: "10px", color: "var(--accent-violet)", fontWeight: 600 }}>
                                                        {ft?.icon} {f.label || ft?.label}
                                                    </span>
                                                );
                                            })}
                                            {parseSchema(job.form_schema).collect_email && (
                                                <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(59,130,246,0.08)", fontSize: "10px", color: "var(--accent-blue)", fontWeight: 600 }}>
                                                    ✉ Auto-collect email
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                            {parseSchema(job.form_schema).fields.length} fields · Created {new Date(job.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            onClick={() => copyShareLink(job.id)}
                                            style={{
                                                background: copyingId === job.id ? "var(--accent-emerald)" : "rgba(16,185,129,0.1)",
                                                border: `1px solid ${copyingId === job.id ? "var(--accent-emerald)" : "rgba(16,185,129,0.3)"}`,
                                                borderRadius: "8px", padding: "8px 14px",
                                                color: copyingId === job.id ? "#fff" : "var(--accent-emerald)",
                                                fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                                            }}
                                        >
                                            {copyingId === job.id ? "Copied! ✓" : "Share Link 🔗"}
                                        </button>
                                        <button onClick={() => editJob(job)} style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "8px", padding: "8px 14px", color: "var(--accent-blue)", fontSize: "12px", cursor: "pointer" }}>Edit</button>
                                        <button onClick={() => toggleJobActive(job.id, job.is_active)} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "8px 14px", color: "var(--accent-amber)", fontSize: "12px", cursor: "pointer" }}>{job.is_active ? "Deactivate" : "Activate"}</button>
                                        <button onClick={() => deleteJob(job.id)} style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "8px", padding: "8px 14px", color: "var(--accent-rose)", fontSize: "12px", cursor: "pointer" }}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
