import { useState, useEffect } from 'react';
import {
  Dialog,
  Pane,
  TextInput,
  Textarea,
  Button,
  Select,
  Checkbox,
  FormField,
} from 'evergreen-ui';

export function CompanyForm({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    location: '',
    size: '',
    open_to_remote: false,
    notes: '',
    jobs_link: '',
    career_link_guess: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        website: initialData.website || '',
        location: initialData.location || '',
        size: initialData.size || '',
        open_to_remote: initialData.open_to_remote || false,
        notes: initialData.notes || '',
        jobs_link: initialData.jobs_link || '',
        career_link_guess: initialData.career_link_guess || '',
      });
    } else {
      setFormData({
        name: '',
        website: '',
        location: '',
        size: '',
        open_to_remote: false,
        notes: '',
        jobs_link: '',
        career_link_guess: '',
      });
    }
    setErrors({});
  }, [isOpen, initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de l\'entreprise est requis';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  return (
    <Dialog
      isShown={isOpen}
      title={initialData ? 'Modifier l\'entreprise' : 'Ajouter une entreprise'}
      onCloseComplete={onClose}
      hasFooter={false}
      width="600px"
    >
      <Pane padding={16} display="flex" flexDirection="column" gap={16}>
        <FormField label="Nom de l'entreprise *" validationMessage={errors.name}>
          <TextInput
            placeholder="ex: Acme Corp"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            isInvalid={!!errors.name}
          />
        </FormField>

        <FormField label="Site web">
          <TextInput
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            type="url"
          />
        </FormField>

        <FormField label="Localisation">
          <TextInput
            placeholder="ex: Paris, France"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </FormField>

        <FormField label="Taille de l'entreprise">
          <Select
            value={formData.size}
            onChange={(e) => handleChange('size', e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
            <option value="startup">Startup (&lt;50)</option>
            <option value="small">Petite (50-200)</option>
            <option value="medium">Moyenne (200-1000)</option>
            <option value="large">Grande (&gt;1000)</option>
          </Select>
        </FormField>

        <Pane>
          <Checkbox
            label="Ouverte au télétravail"
            checked={formData.open_to_remote}
            onChange={(e) => handleChange('open_to_remote', e.target.checked)}
          />
        </Pane>

        <FormField label="Lien vers les offres d'emploi">
          <TextInput
            placeholder="https://example.com/jobs"
            value={formData.jobs_link}
            onChange={(e) => handleChange('jobs_link', e.target.value)}
            type="url"
          />
        </FormField>

        <FormField label="Lien supposé pour carrières">
          <TextInput
            placeholder="https://example.com/careers"
            value={formData.career_link_guess}
            onChange={(e) => handleChange('career_link_guess', e.target.value)}
            type="url"
          />
        </FormField>

        <FormField label="Notes">
          <Textarea
            placeholder="Ajouter des notes sur cette entreprise..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            height={100}
          />
        </FormField>

        <Pane display="flex" gap={8} justifyContent="flex-end" marginTop={16}>
          <Button onClick={onClose} appearance="minimal">
            Annuler
          </Button>
          <Button
            appearance="primary"
            intent="success"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            {initialData ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </Pane>
      </Pane>
    </Dialog>
  );
}
