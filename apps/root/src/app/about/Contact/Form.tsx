'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { InferType } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { FormFieldError } from '@danieljoffe.com/shared-ui/FormFieldError';
import {
  BASE_FIELD,
  DISABLED,
  FIELD_ERROR,
  FIELD_PADDING,
  FIELD_PLACEHOLDER,
  FORM_LABEL,
  REQUIRED_MARK,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { cn } from '@/lib/cn';
import { CONTACT_FORM_ID } from '@/utils/constants';
import { formSchema } from '@/app/api/email/contact/schema';
import { analytics } from '@/lib/analytics';
import { publicEnv } from '@/lib/public.env';
import Button from '@/components/Button';
import { captureFormError, addBreadcrumb } from '@/lib/errorTracking';
import { useToast } from '@/state/Toast/ToastProvider';

const HCaptcha = dynamic(() => import('@hcaptcha/react-hcaptcha'), {
  ssr: false,
  loading: () => (
    <div
      className='flex items-center justify-center min-h-52'
      role='status'
      aria-live='polite'
      aria-label='Loading content'
    >
      <div className='flex flex-col items-center gap-3'>
        <div className='flex gap-1.5'>
          {[0, 0.1, 0.2, 0.3].map((delay, i) => (
            <span
              key={i}
              className={`size-2 rounded-full ${i % 2 === 0 ? 'bg-brand-500' : 'bg-brand-500/60'} animate-bounce`}
              style={{ animationDelay: `${delay}s`, animationDuration: '0.6s' }}
            />
          ))}
        </div>
        <Text variant='body' as='span' className='animate-pulse'>
          Loading...
        </Text>
      </div>
    </div>
  ),
});

type ContactFormData = InferType<typeof formSchema>;

export default function Form() {
  const router = useRouter();
  const { toast } = useToast();
  const [shouldLoadCaptcha, setShouldLoadCaptcha] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<ContactFormData>({
    resolver: yupResolver(formSchema),
  });

  // Lazy load hCaptcha only when the form section is visible
  useEffect(() => {
    const container = captchaContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadCaptcha(true);
          analytics.formStart('contact');
          addBreadcrumb('Contact form visible', 'form', {
            formId: CONTACT_FORM_ID,
          });
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
      const response = await fetch('/api/email/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      analytics.formSubmit('contact');
      addBreadcrumb('Contact form submitted successfully', 'form', {
        formId: CONTACT_FORM_ID,
      });
      toast({
        variant: 'success',
        title: 'Message sent!',
        description: 'Redirecting you now...',
      });
      router.push('/thank-you/email');
    } catch (error) {
      analytics.formError('contact', 'Failed to send message');

      // Capture form submission error in Sentry
      captureFormError(
        CONTACT_FORM_ID,
        error instanceof Error ? error : new Error('Failed to send message')
      );

      setError('root.unknownError', {
        type: 'manual',
        message: 'Failed to send message. Please try again.',
      });
      toast({
        variant: 'error',
        title: 'Failed to send message',
        description: 'Please try again.',
      });
    }
  };

  const onVerify = (token: string) => {
    setValue('hcaptcha', token);
  };

  return (
    <form
      id={CONTACT_FORM_ID}
      className='flex flex-col gap-4 relative'
      onSubmit={handleSubmit(onSubmit)}
      action=''
      aria-labelledby='contact-form-heading'
      noValidate
    >
      <header>
        <Heading
          variant='component'
          as='h3'
          id='contact-form-heading'
          className='sr-only'
        >
          Contact Form
        </Heading>
      </header>

      <fieldset>
        <legend className='sr-only'>Contact Information</legend>
        <div className='flex flex-col gap-4'>
          <div className='w-full'>
            <label htmlFor='name' className={FORM_LABEL}>
              Name
              <span className={REQUIRED_MARK}>*</span>
            </label>
            <input
              id='name'
              className={cn(
                BASE_FIELD,
                FIELD_PADDING,
                FIELD_PLACEHOLDER,
                DISABLED,
                errors?.name && FIELD_ERROR
              )}
              placeholder='John Doe'
              type='text'
              autoComplete='name'
              required
              aria-invalid={!!errors?.name}
              data-sentry-mask
              {...register('name')}
              aria-describedby={
                errors?.name?.message ? 'name-error' : undefined
              }
            />
            <FormFieldError message={errors?.name?.message} id='name-error' />
          </div>

          <div className='w-full'>
            <label htmlFor='email' className={FORM_LABEL}>
              Email
              <span className={REQUIRED_MARK}>*</span>
            </label>
            <input
              id='email'
              className={cn(
                BASE_FIELD,
                FIELD_PADDING,
                FIELD_PLACEHOLDER,
                DISABLED,
                errors?.email && FIELD_ERROR
              )}
              placeholder='john.doe@example.com'
              type='email'
              autoComplete='email'
              required
              aria-invalid={!!errors?.email}
              data-sentry-mask
              {...register('email')}
              aria-describedby={
                errors?.email?.message ? 'email-error' : undefined
              }
            />
            <FormFieldError message={errors?.email?.message} id='email-error' />
          </div>

          <div className='w-full'>
            <label htmlFor='message' className={FORM_LABEL}>
              Message
              <span className={REQUIRED_MARK}>*</span>
            </label>
            <textarea
              id='message'
              className={cn(
                BASE_FIELD,
                FIELD_PADDING,
                FIELD_PLACEHOLDER,
                DISABLED,
                errors?.message && FIELD_ERROR
              )}
              placeholder={`Hello, I'm interested in your services.\n\nBest regards,\nJohn Doe`}
              autoComplete='off'
              rows={5}
              required
              aria-invalid={!!errors?.message}
              data-sentry-mask
              {...register('message')}
              aria-describedby={
                errors?.message?.message ? 'message-error' : undefined
              }
            />
            <FormFieldError
              message={errors?.message?.message}
              id='message-error'
            />
          </div>
        </div>
      </fieldset>

      {/* Honeypot field for spam protection */}
      <div className='absolute top-0 left-0 size-0 pointer-events-none -z-1 hidden'>
        <input
          name='address'
          placeholder='1234 Main St, Anytown, USA'
          type='text'
          autoComplete='off'
          className='hidden'
          aria-hidden={true}
          tabIndex={-1}
        />
      </div>

      <div ref={captchaContainerRef} className='min-h-[78px]'>
        <Text variant='body' as='label' className='block mb-1'>
          Security verification
        </Text>
        {shouldLoadCaptcha && (
          <HCaptcha
            sitekey={publicEnv.NEXT_PUBLIC_HCAPTCHA_SITE_ID ?? ''}
            onVerify={onVerify}
            aria-label='Security verification'
            loadAsync={true}
          />
        )}
      </div>

      <div className='flex justify-center'>
        <Button
          variant='primary'
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
          <Text variant='error'>
            {errors.root?.serverError?.message ||
              errors.root?.configurationError?.message ||
              errors.root?.unknownError?.message ||
              errors.hcaptcha?.message}
          </Text>
        </div>
      )}
    </form>
  );
}
