'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { InferType } from 'yup';
import { CONTACT_FORM_ID } from '@/utils/constants';
import { formSchema } from '@/app/api/email/contact/schema';
import { analytics } from '@/lib/analytics';
import { publicEnv } from '@/lib/public.env';
import { yupResolver } from '@hookform/resolvers/yup';
import { Stack, Input, Textarea, Loading } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import { captureFormError, addBreadcrumb } from '@/lib/errorTracking';

const HCaptcha = dynamic(() => import('@hcaptcha/react-hcaptcha'), {
  ssr: false,
  loading: () => <Loading />,
});

type ContactFormData = InferType<typeof formSchema>;

export default function Form() {
  const router = useRouter();
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
        <h3 id='contact-form-heading' className='sr-only'>
          Contact Form
        </h3>
      </header>

      <fieldset>
        <legend className='sr-only'>Contact Information</legend>
        <Stack direction='vertical' gap='md'>
          <Input
            className='text-foreground placeholder-foreground-muted'
            placeholder='John Doe'
            type='text'
            autoComplete='name'
            label='Name'
            required={true}
            data-sentry-mask
            {...register('name')}
            error={errors?.name?.message}
            aria-describedby={errors?.name?.message ? 'name-error' : undefined}
          />

          <Input
            className='text-foreground placeholder-foreground-muted'
            label='Email'
            placeholder='john.doe@example.com'
            type='email'
            autoComplete='email'
            required={true}
            data-sentry-mask
            {...register('email')}
            error={errors?.email?.message}
            aria-describedby={
              errors?.email?.message ? 'email-error' : undefined
            }
          />

          <Textarea
            className='text-foreground placeholder-foreground-muted'
            label='Message'
            placeholder={`Hello, I'm interested in your services.\n\nBest regards,\nJohn Doe`}
            autoComplete='off'
            required={true}
            rows={5}
            data-sentry-mask
            {...register('message')}
            error={errors?.message?.message}
            aria-describedby={
              errors?.message?.message ? 'message-error' : undefined
            }
          />
        </Stack>
      </fieldset>

      {/* Honeypot field for spam protection */}
      <div className='absolute top-0 left-0 size-0 pointer-events-none -z-1 hidden'>
        <Input
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

      <div ref={captchaContainerRef} className='min-h-[78px]'>
        <label className='text-sm text-foreground-muted block mb-1'>
          Security verification
        </label>
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
          <p className='text-error text-sm'>
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
