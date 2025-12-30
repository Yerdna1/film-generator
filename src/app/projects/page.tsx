import { redirect } from 'next/navigation';

// Projects are shown on the main dashboard
// This page redirects there to avoid duplication
export default function ProjectsPage() {
  redirect('/');
}
