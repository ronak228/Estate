import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Profile + Budget + Inquiries ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Profile card */}
          <Card title="Profile">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{contact.phone}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{contact.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Company</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{contact.company_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Preferred Area</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{contact.preferredArea || '—'}</dd>
              </div>
              {contact.address && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{contact.address}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Budget card */}
          <Card title="Budget & Preferences">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Budget Min</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {contact.budgetMin != null ? formatCurrency(contact.budgetMin) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Budget Max</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {contact.budgetMax != null ? formatCurrency(contact.budgetMax) : '—'}
                </dd>
              </div>
            </dl>
            {!contact.budgetMin && !contact.budgetMax && (
              <p className="text-xs text-gray-400 mt-2">No budget information recorded yet.</p>
            )}
          </Card>

          {/* Inquiry history */}
          <Card title={`Inquiry History (${contact.inquiries?.length || 0})`}>
            {contact.inquiries?.length === 0 ? (
              <p className="text-sm text-gray-400">No inquiries linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {contact.inquiries.map((inq) => (
                  <li key={inq.id}>
                    <Link
                      to={`/inquiries/${inq.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-gray-50 transition-colors"
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

        {/* ── Right: Interaction log ── */}
        <Card title="Interaction Log" className="h-fit">
          <InteractionLog
            interactions={contact.interactions || []}
            onAdd={() => setInteractionOpen(true)}
            canAdd
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
