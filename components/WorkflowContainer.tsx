import React from 'react';
import { WorkflowStepKey, WorkflowData, View } from '../types';
import OnboardingTask from './OnboardingTask';
import AudiencePersonaBuilder from './AudiencePersonaBuilder';
// FIX: Changed to a default import since the component now has a default export.
import ContentFunnelMapper from './ContentFunnelMapper';
import TopicExplorer from './TopicExplorer';
import ResearchAssistant from './ResearchAssistant';
import ContentSeriesPlanner from './ContentSeriesPlanner';
import VideoBriefGenerator from './VideoBriefGenerator';
import ScriptAnalyzer from './ScriptAnalyzer';
// FIX: Changed to a named import to resolve module loading issues, likely caused by a circular dependency.
import { ThumbnailTester } from './ThumbnailTester';
import XIcon from './icons/XIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

interface WorkflowContainerProps {
    steps: { id: WorkflowStepKey; name: string }[];
    currentStepIndex: number;
    workflowData: WorkflowData;
    completedSteps: Set<WorkflowStepKey>;
    onNextStep: () => void;
    onPrevStep: () => void;
    onCompleteStep: (stepId: WorkflowStepKey, data: any) => void;
    onExitWorkflow: () => void;
    onHelpClick: () => void;
    onManageApiKey: () => void;
}

const WorkflowStepper: React.FC<{ steps: { name: string }[], currentStepIndex: number, completedSteps: Set<WorkflowStepKey>, stepIds: WorkflowStepKey[] }> = ({ steps, currentStepIndex, completedSteps, stepIds }) => {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                        {stepIdx < currentStepIndex ? (
                             <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-brand-purple" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple">
                                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                                    </svg>
                                </div>
                             </>
                        ) : stepIdx === currentStepIndex ? (
                             <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-dark-border" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-purple bg-dark-card">
                                    <span className="h-2.5 w-2.5 rounded-full bg-brand-purple" aria-hidden="true" />
                                </div>
                            </>
                        ) : (
                             <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-dark-border" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-dark-border bg-dark-card" />
                             </>
                        )}
                         <span className="absolute top-10 -left-2 w-12 text-center text-xs text-dark-text-secondary">{step.name}</span>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

const WorkflowContainer: React.FC<WorkflowContainerProps> = ({
    steps, currentStepIndex, workflowData, completedSteps, onNextStep, onPrevStep, onCompleteStep, onExitWorkflow, onHelpClick, onManageApiKey
}) => {
    const currentStep = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;
    const isStepCompleted = completedSteps.has(currentStep.id) || currentStepIndex < Array.from(completedSteps).length;


    const renderCurrentStepComponent = () => {
        const stepId = currentStep.id;
        const commonProps = {
            isWorkflowMode: true,
            onWorkflowComplete: (data: any) => onCompleteStep(stepId, data),
        };

        switch (stepId) {
            case 'onboardingTask':
                return <OnboardingTask {...commonProps} onHelpClick={onHelpClick} />;
            case 'audiencePersonaBuilder':
                return <AudiencePersonaBuilder {...commonProps} initialData={workflowData.onboardingTask?.summary || ''} />;
            case 'contentFunnelMapper':
                // FIX: Pass the initialData as an object with a `topic` property, as expected by ContentFunnelMapper.
                return <ContentFunnelMapper {...commonProps} initialData={{ topic: workflowData.onboardingTask?.marketPitch || '' }} />;
            case 'topicExplorer':
                 return <TopicExplorer {...commonProps} initialData={{ topic: workflowData.contentFunnelMapper?.awareness.ideas[0]?.title || '' }} />;
            case 'researchAssistant':
                return <ResearchAssistant {...commonProps} initialData={workflowData.topicExplorer?.selectedNiche?.name || ''} />;
            case 'contentSeriesPlanner':
                return <ContentSeriesPlanner {...commonProps} initialData={{ topic: workflowData.topicExplorer?.selectedNiche?.name || '' }} onNavigate={() => {}} />;
            case 'videoBrief':
                return <VideoBriefGenerator {...commonProps} initialData={workflowData.contentSeriesPlanner?.selectedEpisode} />;
            case 'scriptAnalyzer':
                 const scriptText = workflowData.videoBrief ? workflowData.videoBrief.outline.map(item =>
                    `## ${item.timestamp} - ${item.topic}\n\n` +
                    item.points.map(p => `- ${p}`).join('\n')
                ).join('\n\n') : '';
                 return <ScriptAnalyzer {...commonProps} initialData={{ script: scriptText }} />;
            case 'thumbnailTester':
                 const topic = workflowData.contentSeriesPlanner?.selectedEpisode?.title || workflowData.videoBrief?.titleOptions[0] || '';
                 const titleA = workflowData.videoBrief?.titleOptions[0] || '';
                 const titleB = workflowData.videoBrief?.titleOptions[1] || '';
                 // FIX: Pass the onManageApiKey prop to ThumbnailTester, which is required for API key management.
                 return <ThumbnailTester {...commonProps} initialData={{ topic, titleA, titleB }} onManageApiKey={onManageApiKey} />;
            default:
                return <div>Unknown workflow step</div>;
        }
    };


    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 bg-dark-card border border-dark-border rounded-lg">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Guided Workflow</h1>
                    <p className="text-sm text-dark-text-secondary">Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].name}</p>
                </div>
                <button onClick={onExitWorkflow} className="flex items-center gap-2 bg-dark-border text-white font-semibold px-4 py-2 rounded-md hover:bg-red-500/50 transition-colors text-sm">
                   <XIcon className="w-5 h-5"/> Exit Workflow
                </button>
            </div>
            
            <div className="bg-dark-card p-6 rounded-lg border border-dark-border overflow-x-auto">
              <WorkflowStepper steps={steps} currentStepIndex={currentStepIndex} completedSteps={completedSteps} stepIds={steps.map(s => s.id)} />
            </div>

            <div className="min-h-[50vh]">
                 {renderCurrentStepComponent()}
            </div>
            
             <div className="flex justify-between items-center gap-4 p-4 bg-dark-card border border-dark-border rounded-lg">
                <button onClick={onPrevStep} disabled={currentStepIndex === 0} className="flex items-center gap-2 bg-dark-border text-white font-semibold px-6 py-2 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <ArrowLeftIcon className="w-5 h-5" /> Back
                </button>
                <div className="text-center">
                    {!isStepCompleted && <p className="text-xs text-yellow-400 italic">Complete the task above to proceed.</p>}
                </div>
                <button onClick={onNextStep} disabled={!isStepCompleted} className="flex items-center gap-2 bg-brand-purple text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-purple-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLastStep ? 'Finish' : 'Next Step'} <ArrowRightIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default WorkflowContainer;
