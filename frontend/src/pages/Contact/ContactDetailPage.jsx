import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, Phone, Mail, Building2, MapPin, Wallet, Tag, Activity } from 'lucide-react';
import contactService from '../../services/contactService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import InteractionLog from '../../components/shared/InteractionLog';
import InteractionForm from '../../components/shared/InteractionForm';
import Card from '../../components/shared/Card';
import ContactForm from './ContactForm';
import { formatDate, formatCurrency } from '../../utils/format';

const SectionIcon = ({ icon: Icon }) => (
  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
    <Icon size={17} />
  </div>
);

const DetailField = ({ icon: Icon, label, value, span }) => (
  <div className={span ? 'col-span-2' : undefined}>
    <dt className="text-[11px] text-gray-400 flex items-center gap-1.5">
      <Icon size={12} className="text-gray-400" />
      {label}
    </dt>
    <dd className="font-semibold text-gray-800 mt-1">{value}</dd>
  </div>
);

const TERMINAL_STAGES = ['NOT_INTERESTED', 'BOOKED'];

const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);

  const fetchContact = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await contactService.getContact(id);
      setContact(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  if (loading) return <PageLayout><LoadingState label="Loading contact..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchContact} /></PageLayout>;
  if (!contact) return null;

  const inquiryOptions = (contact.inquiries || []).map((inq) => ({
    value: inq.id,
    label: `${inq.project?.name || 'No project'} — ${inq.stage}`,
  }));

  const inquiries = contact.inquiries || [];
  const activeInquiries = inquiries.filter((inq) => !TERMINAL_STAGES.includes(inq.stage)).length;
  const daysSince = Math.max(0, Math.floor((Date.now() - new Date(contact.createdAt)) / 86400000));
  const hasBudget = contact.budgetMin != null || contact.budgetMax != null;

  return (
    <PageLayout>
      <PageHeader
        title={contact.fullName}
        subtitle={`Contact since ${formatDate(contact.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/contacts')}>
              Back
            </Button>
            <Button variant="outline" size="sm" icon={Edit} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        }
      />

      {/* At-a-glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Budget Range</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5 tabular-nums">
            {hasBudget
              ? `${contact.budgetMin != null ? formatCurrency(contact.budgetMin) : '—'} – ${contact.budgetMax != null ? formatCurrency(contact.budgetMax) : '—'}`
              : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Preferred Area</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5 truncate">{contact.preferredArea || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Inquiries</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{inquiries.length} total</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{activeInquiries} active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Contact Since</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5">{formatDate(contact.createdAt)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{daysSince} day{daysSince === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left: Profile + Budget + Inquiries ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Profile card */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={Phone} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Profile</h2>
              </div>
            }
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <DetailField icon={Phone} label="Phone" value={contact.phone} />
              <DetailField icon={Mail} label="Email" value={contact.email || '—'} />
              <DetailField icon={Building2} label="Company" value={contact.company_name || '—'} />
              <DetailField icon={MapPin} label="Preferred Area" value={contact.preferredArea || '—'} />
              {contact.address && (
                <DetailField icon={MapPin} label="Address" value={contact.address} span />
              )}
            </dl>
          </Card>

          {/* Budget card */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={Wallet} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Budget &amp; Preferences</h2>
              </div>
            }
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <DetailField
                icon={Wallet}
                label="Budget Min"
                value={contact.budgetMin != null ? formatCurrency(contact.budgetMin) : '—'}
              />
              <DetailField
                icon={Wallet}
                label="Budget Max"
                value={contact.budgetMax != null ? formatCurrency(contact.budgetMax) : '—'}
              />
            </dl>
            {!hasBudget && (
              <p className="text-xs text-gray-400 mt-3">No budget information recorded yet.</p>
            )}
          </Card>

          {/* Inquiry history */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={Tag} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Inquiry History ({inquiries.length})</h2>
              </div>
            }
          >
            {inquiries.length === 0 ? (
              <p className="text-sm text-gray-400">No inquiries linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {inquiries.map((inq) => (
                  <li key={inq.id}>
                    <Link
                      to={`/inquiries/${inq.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-gray-50 transition-colors duration-150 ease-snappy"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {inq.project?.name || 'No project'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(inq.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={inq.stage} />
                        {inq.assignedTo && (
                          <span className="text-xs text-gray-400">
                            {inq.assignedTo.fullName}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Right: Interaction log — sticky rail ── */}
        <Card
          className="h-fit lg:sticky lg:top-6"
          title={
            <div className="flex items-center gap-3">
              <SectionIcon icon={Activity} />
              <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Interaction Log</h2>
            </div>
          }
          actions={
            <Button variant="ghost" size="sm" icon={Plus} onClick={() => setInteractionOpen(true)}>
              Log
            </Button>
          }
        >
          <InteractionLog
            interactions={contact.interactions || []}
            onAdd={() => setInteractionOpen(true)}
            canAdd={false}
          />
        </Card>
      </div>

      {/* Edit Contact Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contact"
        size="lg"
      >
        <ContactForm
          contact={contact}
          onSuccess={() => { setEditOpen(false); fetchContact(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Log Interaction Modal */}
      <Modal
        isOpen={interactionOpen}
        onClose={() => setInteractionOpen(false)}
        title="Log Interaction"
        size="md"
      >
        <InteractionForm
          contactId={contact.id}
          inquiryOptions={inquiryOptions}
          onSuccess={() => { setInteractionOpen(false); fetchContact(); }}
          onCancel={() => setInteractionOpen(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default ContactDetailPage;
