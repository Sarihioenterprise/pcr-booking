-- Create vehicle-photos storage bucket
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Authenticated users can upload vehicle photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'vehicle-photos');

-- Allow public read
create policy "Public can view vehicle photos"
on storage.objects for select
to public
using (bucket_id = 'vehicle-photos');

-- Allow authenticated users to delete their uploads
create policy "Authenticated users can delete vehicle photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'vehicle-photos');
