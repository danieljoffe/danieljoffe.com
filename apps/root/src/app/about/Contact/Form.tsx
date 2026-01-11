'use client';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTransitionRouter } from 'next-transition-router';
import Button from '@/components/units/Button';
import TextInput from '@/components/units/TextInput';
import { publicEnv } from '@/lib/public.env';
import { formSchema } from '@/app/api/email/schema';
import type { InferType } from 'yup';
import dynamic from 'next/dynamic';
import Loading from '@/components/assembled/Loading';

export const contactFormId = 'contact-form';
const HCaptcha = dynamic(() => import('@hcaptcha/react-hcaptcha'), {
  ssr: false,
  loading: () => <Loading />,
});

type ContactFormData = InferType<typeof formSchema>;

export default function Form() {
  const router = useTransitionRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<ContactFormData>({
    resolver: yupResolver(formSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    if (isSubmitting) {
      setError('root', {
        type: 'manual',
        message: 'Please wait for the previous submission to complete.',
      });
      return;
    }

    if (!data.hcaptcha) {
      setError('hcaptcha', {
        type: 'manual',
        message: 'Please complete the captcha verification.',
      });
      return;
    }

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      router.push('/thank-you/email');
    } catch (_error) {
      setError('root.unknownError', {
        type: 'manual',
        message: 'Failed to send message. Please try again.',
      });
    }
  };

  const onVerify = (token: string) => {
    setValue('hcaptcha', token);
  };

  return (
    <form
      id={contactFormId}
      className='flex flex-col gap-4 text-white relative'
      onSubmit={handleSubmit(onSubmit)}
      action=''
      aria-labelledby='contact-form-heading'
      noValidate
    >
      <header className='mb-2'>
        <h3 id='contact-form-heading' className='sr-only'>
          Contact Form
        </h3>
        <p className='mb-2'>
          I&apos;m currently seeking senior frontend or full-stack engineering
          roles—remote or LA-based. Whether you have an opportunity to discuss
          or just want to chat about performance optimization, I&apos;d love to
          hear from you.
        </p>
        <p className='text-sm font-medium'>
          <strong>Response time:</strong> Usually within 24 hours
        </p>
      </header>

      <fieldset className='flex flex-col gap-4'>
        <legend className='sr-only'>Contact Information</legend>

        <TextInput
          className='text-neutral-900 placeholder-neutral-800'
          placeholder='John Doe'
          type='text'
          autoComplete='name'
          label='Name'
          required={true}
          {...register('name')}
          error={errors?.name?.message}
          aria-describedby={errors?.name?.message ? 'name-error' : undefined}
        />

        <TextInput
          className='text-neutral-900 placeholder-neutral-800'
          label='Email'
          placeholder='john.doe@example.com'
          type='email'
          autoComplete='email'
          required={true}
          {...register('email')}
          error={errors?.email?.message}
          aria-describedby={errors?.email?.message ? 'email-error' : undefined}
        />

        <TextInput
          className='text-neutral-900 placeholder-neutral-800'
          label='Message'
          placeholder={`Hello, I'm interested in your services.\n\nBest regards,\nJohn Doe`}
          as='textarea'
          autoComplete='off'
          required={true}
          {...register('message')}
          error={errors?.message?.message}
          aria-describedby={
            errors?.message?.message ? 'message-error' : undefined
          }
        />
      </fieldset>

      {/* Honeypot field for spam protection */}
      <div className='absolute top-0 left-0 w-0 h-0 pointer-events-none -z-1 hidden'>
        <TextInput
          name='address'
          label='Address'
          placeholder='1234 Main St, Anytown, USA'
          type='text'
          autoComplete='off'
          className='hidden'
          aria-hidden={true}
          tabIndex={-1}
        />
      </div>

      <div>
        <HCaptcha
          sitekey={publicEnv.NEXT_PUBLIC_HCAPTCHA_SITE_ID ?? ''}
          onVerify={onVerify}
          aria-label='Security verification'
          loadAsync={true}
        />
      </div>

      <div>
        <Button
          variant='secondary'
          type='submit'
          disabled={isSubmitting}
          aria-describedby={
            errors.root?.serverError || errors.root?.configurationError
              ? 'form-error'
              : undefined
          }
          name='submit'
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>

      {(errors.root?.serverError ||
        errors.root?.configurationError ||
        errors.root?.unknownError ||
        errors.hcaptcha) && (
        <div id='form-error' role='alert' aria-live='assertive'>
          <p className='text-rose-500 text-sm'>
            {errors.root?.serverError?.message ||
              errors.root?.configurationError?.message ||
              errors.root?.unknownError?.message ||
              errors.hcaptcha?.message}
          </p>
        </div>
      )}
    </form>
  );
}
