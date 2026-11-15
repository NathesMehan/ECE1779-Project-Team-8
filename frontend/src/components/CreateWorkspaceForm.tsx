
import { useState, type FormEvent } from 'react'
import Button from './Button'
import './CreateWorkspaceForm.css'

type CreateWorkspaceFormProps = {
  onCancel: () => void
  onCreate: (name: string, description: string) => void
}

function CreateWorkspaceForm({
  onCancel,
  onCreate,
}: CreateWorkspaceFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()

    if (!trimmedName) return

    onCreate(trimmedName, description.trim())
  }

  return (
    <form className="workspace-form" onSubmit={handleSubmit}>
      <h2>Create a Workspace</h2>
      <p>Give your new workspace a name and description.</p>

      <label htmlFor="workspace-name">Workspace Name *</label>
      <input
        id="workspace-name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Research Project"
        maxLength={100}
        required
      />

      <label htmlFor="workspace-description">
        Description (optional)
      </label>
      <textarea
        id="workspace-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What is this workspace for?"
        rows={4}
      />

      <div className="workspace-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>

        <Button type="submit">
          Create Workspace
        </Button>
      </div>
    </form>
  )
}

export default CreateWorkspaceForm
