import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiService, PlacementForm } from '../../services/api';

export const StudentForms: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<PlacementForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) return;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const f = await apiService.getForm(formId);
        setForm(f);
        const profileRes = await apiService.getMyStudentProfile().catch(() => null);
        if (profileRes) {
          const prefill: Record<string, any> = {};
          f.fields.forEach((field) => {
            if (field.name === 'full_name') prefill[field.name] = profileRes.name || user?.name || '';
            else if (field.name === 'email') prefill[field.name] = profileRes.email || user?.email || '';
            else if (field.name === 'roll_number') prefill[field.name] = profileRes.rollNumber || profileRes.roll_number || '';
            else if (field.name === 'branch') prefill[field.name] = profileRes.branch || '';
            else if (field.name === 'cgpa') prefill[field.name] = profileRes.cgpa || '';
          });
          setAnswers(prefill);
        }
      } catch (err: any) {
        setLoadError(err?.response?.data?.detail || 'Unable to load the form.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [formId, user]);

  const handleChange = (name: string, value: any) => setAnswers((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiService.submitForm(formId, answers);
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail || 'Unable to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
      <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
      <p className="text-sm">Loading form...</p>
    </div>
  );

  if (loadError || !form) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-slate-400">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-300">{loadError || 'Form not found.'}</p>
      <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  if (submitSuccess) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
      <div className="p-4 rounded-full bg-emerald-900/30 border border-emerald-500/40">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Form Submitted Successfully!</h2>
        <p className="text-sm text-slate-400">Your response has been recorded for <strong className="text-slate-200">{form.title}</strong>.</p>
        <p className="text-xs text-slate-500 mt-1">Submitted by: {user?.name || 'You'}</p>
      </div>
      <div className="flex gap-3 mt-2">
        {form.drive_id && (
          <Button variant="primary" size="sm" icon={<Building2 className="w-4 h-4" />} onClick={() => navigate('/student/community/' + form.drive_id)}>
            Back to Community
          </Button>
        )}
        <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1] max-w-2xl mx-auto">
      <PageHeader
        title={form.title}
        subtitle={form.description || ('Uploaded by ' + form.created_by_name + ' (Placement Office)')}
        icon={<ClipboardList className="w-5 h-5 text-white" />}
        action={<Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>Back</Button>}
      />

      <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-900/20 border border-violet-700/30 text-xs text-violet-300">
        <ClipboardList className="w-4 h-4 shrink-0" />
        <div>
          <span className="font-bold">{form.title}</span>
          <span className="text-slate-500 ml-1">• Uploaded by {form.created_by_name}</span>
          {form.submission_count > 0 && (
            <span className="text-slate-500 ml-1">• {form.submission_count} student{form.submission_count !== 1 ? 's' : ''} submitted</span>
          )}
        </div>
      </div>

      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="border-b border-[#1B2A40]">
          <CardTitle className="text-base font-bold">Fill Form</CardTitle>
          <p className="text-xs text-slate-400">Fields marked with * are required. Your responses will be stored against your account.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {form.fields.map((field) => (
              <div key={field.name}>
                <label className="text-xs font-bold text-[#F8FAFC] block mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.field_type === 'textarea' ? (
                  <textarea
                    required={field.required}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ''}
                    rows={3}
                    className="w-full text-sm p-3 bg-[#0B1628] border border-[#243650] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] resize-none"
                  />
                ) : field.field_type === 'select' && field.options ? (
                  <select
                    required={field.required}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full text-sm p-3 bg-[#0B1628] border border-[#243650] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="">Select an option...</option>
                    {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.field_type === 'checkbox' ? (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={'field-' + field.name} checked={!!answers[field.name]} onChange={(e) => handleChange(field.name, e.target.checked)} className="w-4 h-4 accent-blue-500" />
                    <label htmlFor={'field-' + field.name} className="text-sm text-slate-300">{field.placeholder || 'Yes'}</label>
                  </div>
                ) : (
                  <input
                    type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : 'text'}
                    required={field.required}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleChange(field.name, field.field_type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    placeholder={field.placeholder || ''}
                    step={field.field_type === 'number' ? '0.01' : undefined}
                    className="w-full text-sm p-3 bg-[#0B1628] border border-[#243650] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                  />
                )}
              </div>
            ))}

            {submitError && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                icon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Form'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentForms;
